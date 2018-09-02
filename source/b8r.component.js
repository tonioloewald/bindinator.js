/**
# Components

    component(name, url);

Loads component from url registers it as "name". (Components are registered
separately from other objects.)

Returns a promise of the component once loaded.

    component('path/to/name');

If just a path is provided, the name of the component will be
inferred.

**Note**: the extension `.component.html` is appended to urls.

Instances of the component will automatically be inserted as expected once
loaded.

**Also note**: you can usually avoid the pattern:

    component(...).then(c => b8r.insertComponent(c, target))

By simply binding the component to the target and letting nature take its
course.

    b8r.insertComponent(component, element, data);

insert a component by name or by passing a component record (e.g. promised by
component() or produced by makeComponent)

If no element is provided, the component will be appended to `document.body`.

Data will be passed to the component's load method and registered as the
component's private instance data. (Usually data is passed automatically
from parent components or via binding, e.g. `data-path="path.to.data` binds that
data to the component).

    b8r.removeComponent(elt); // removes the component's class and instance and empties the element

If elt has a component in it (i.e. has the attribute data-component-id) removes the
element's contents, removes the component-id, and removes any class that ends with '-component'.
Note that `removeComponent` does not preserve children!

## Creating Components Programmatically

    makeComponent(name, source, url, preserve_source); // preserve_source are optional

Create a component with the specified name, source code, and url. Use preserve_source if
you want the component's source code kept for debugging purposes.

`makeComponent` is used internally by component to create components, and by the documentation
system to create components interactively. In general you won't need to use this method at all.

## Singleton Components

    b8r.componentOnce(url [,name]);

This loads the component (if necessary) and then if there is no instance of the component
in the DOM it creates one. It replaces the pattern:

    b8r.component(url).then(c => b8r.insertComponent(c));

And doesn't run the risk of leaking multiple instances of components into the DOM.

## Container Components

    b8r.wrapWithComponent(component, element [, data_path [, attributes]]);

Sometimes you want a component *outside* an element rather than inside it.
The most common example is trying to create a specific modal or floater wrapped
inside a generic modal or floater "wrapper". You could simply use the
generic component inside the specific component but then the generic component
has no simple way to "clean itself up".

`b8r.wrapWithComponent()` returns the wrapping element.

    <div
      class="my-custom-dialog"
      data-component="modal"
    >
      <button
        data-event="click:_component_.terrific"
      >Terrific</button>
    </div>
    <script>
      set('terrific', () => alert('This is terrific!'));
    </script>

In the above example the modal ends up inside the `my-custom-dialog` div. Supposing
that the modal's behavior includes removing itself on close, it will leave behind the
component itself (with nothing inside).

Instead with `wrapWithComponent` you could do this (in a component):

    <button>Terrific</button>
    <script>
      b8r.component('components/modal');
      b8r.wrapWithComponent('modal', component);
      set('terrific', () => alert('This is terrific!'));
    </script>

(Note that this example doesn't play well with the inline-documentation system!)

## Destructors

Component instances are automatically cleaned up once the component element is
removed from the DOM or its id changes (e.g. a new component is loaded over it).
If you want to force a cleanup, you can call:

    b8r.cleanupComponentInstances();

If a component has a property named `destroy` (and it's a method) it will
be called just before the instance is removed from the registry.
*/
/* global require, module */
'use strict';

const components = {};
const component_timeouts = [];
const component_promises = {};
const component_preload_list = [];
const {async_update} = require('./b8r.update.js');
const {create, find, findWithin} = require('./b8r.dom.js');
const {ajax} = require('./b8r.ajax.js');
const makeStylesheet = require('./b8r.makeStylesheet.js');

const makeComponent = function(name, source, url, preserve_source) {
  let css = false, content, script = false, parts, remains;

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/);
  if (parts.length === 3) {
    [, css, remains] = parts;
  } else {
    remains = source;
  }

  // content <script> script </script> nothing
  parts = remains.split(/<script>|<\/script>/);
  if (parts.length === 3) {
    [content, script] = parts;
  } else {
    content = remains;
  }

  const div = create('div');
  div.innerHTML = content;
  /*jshint evil: true */
  let load = () => console.error('component', name, 'cannot load properly');
  try {
    load = script ?
             new Function(
                'require',
                'component',
                'b8r',
                'find',
                'findOne',
                'data',
                'register',
                'get',
                'set',
                'on',
                'touch',
                `${script}\n//# sourceURL=${name}(component)`
              ) :
              false;
  } catch(e) {
    console.error('error creating load method for component', name, e);
    throw `component ${name} load method could not be created`;
  }
  /*jshint evil: false */
  const class_name = `${name}-component`;
  const style = css ? makeStylesheet(css.replace(/_component_/g, class_name), class_name) : false;
  const update_classes = elt => elt.setAttribute('class', elt.getAttribute('class').replace(/_component_/g, class_name));
  findWithin(div, '[class*="_component_"]').forEach(update_classes);
  const component = {
    name,
    style,
    view : div,
    load,
    path : url.split('/').slice(0,-1).join('/'),
  };
  if (component.path === 'undefined') {
    debugger; // jshint ignore:line
  }
  if (preserve_source) {
    component._source = source;
  }
  if (component_timeouts[name]) {
    clearInterval(component_timeouts[name]);
  }
  if (components[name]) {
    // don't want to leak stylesheets
    if (components[name].style) {
      components[name].style.remove();
    }
    console.warn('component %s has been redefined', name);
  }
  components[name] = component;

  find(`[data-component="${name}"]`).forEach(element => {
    // somehow things can happen in between find() and here so the
    // second check is necessary to prevent race conditions
    if (!element.closest('[data-list]') && element.dataset.component === name) {
      async_update(false, element);
    }
  });
  return component;
};

// copied from require.js
// path/to/../foo -> path/foo
const collapse = path => {
  while (path.match(/([^/]+\/\.\.\/)/)) {
    path = path.replace(/([^/]+\/\.\.\/)/g, '');
  }
  return path;
};

const component = (name, url, preserve_source) => {
  if (url === undefined) {
    url = name;
    name = url.split('/').pop();
  }
  if (!component_promises[name] || preserve_source) {
    url = collapse(url);
    component_promises[name] = new Promise(function(resolve, reject) {
      if (components[name] && !preserve_source) {
        resolve(components[name]);
      } else {
        if (component_preload_list.indexOf(url) === -1) {
          component_preload_list.push(url);
        }
        ajax(`${url}.component.html`)
        .then(source => resolve(makeComponent(name, source, url, preserve_source)))
        .catch(err => {
          delete component_promises[name];
          console.error(err, `failed to load component ${url}`);
          reject(err);
        });
      }
    });
  }
  return component_promises[name];
};

module.exports = {
  component,
  components,
  component_timeouts,
  component_preload_list,
  makeComponent,
};
