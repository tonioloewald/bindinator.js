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

    makeComponent(name, source, url, preserveSource); // preserveSource are optional

Create a component with the specified name, source code, and url. Use preserveSource if
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

import { asyncUpdate } from './b8r.update.js'
import { create, find, findWithin } from './b8r.dom.js'
import { ajax } from './b8r.ajax.js'
import makeStylesheet from './b8r.makeStylesheet.js'
import uuid from './uuid.js'
import { AsyncFunction } from './b8r.functions.js'

const components = {}
const componentTimeouts = []
const componentPromises = {}
const componentPreloadMap = {}

/**
## Making Components without Eval

You may prefer to create pure javascript components for any number of reasons.

    makeComponentNoEval(name, {css, html, load})

`load` is a function with the signature:

    async ({component, b8r, find, findOne, data, register, get, set, on, touch}) => {
      // same stuff you'd normally put in a component's script
    }

This should appease linters!

```
<b8r-component name="no-eval"></b8r-component>
<script>
  b8r.makeComponentNoEval('no-eval', {
    css: '._component_ > span { color: yellow; }',
    html: '<span></span>',
    load: async ({findOne}) => {
      findOne('span').textContent = 'Hello Pure Component'
    }
  })
</script>
```
*/

const makeComponentNoEval = function (name, { css, html, load }) {
  const div = document.createElement('div')
  div.innerHTML = html

  const className = `${name}-component`
  const style = css ? makeStylesheet(css.replace(/_component_/g, className), className) : false
  const updateClasses = elt => elt.setAttribute('class', elt.getAttribute('class').replace(/_component_/g, className))
  findWithin(div, '[class*="_component_"]').forEach(updateClasses)
  const component = {
    name,
    style,
    view: div,
    load: (component, b8r, find, findOne, data, register, get, set, on, touch) => {
      load({ component, b8r, find, findOne, data, register, get, set, on, touch })
    },
    path: `inline-${name}`
  }

  if (componentTimeouts[name]) {
    clearInterval(componentTimeouts[name])
  }

  find(`[data-component="${name}"]`).forEach(element => {
    // somehow things can happen in between find() and here so the
    // second check is necessary to prevent race conditions
    if (!element.closest('[data-list]') && element.dataset.component === name) {
      asyncUpdate(false, element)
    }
  })
  components[name] = component
  return component
}

const makeComponent = function (name, source, url, preserveSource) {
  let css = false; let content; let script = false; let parts; let remains

  if (!url) url = uuid()
  componentPreloadMap[name] = url

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/)
  if (parts.length === 3) {
    [, css, remains] = parts
  } else {
    remains = source
  }

  // content <script> script </script> nothing
  parts = remains.split(/<script[^>\n]*>|<\/script>/)
  if (parts.length >= 3) {
    [content, script] = parts
  } else {
    content = remains
  }

  const div = create('div')
  div.innerHTML = content
  /* jshint evil: true */
  let load = () => console.error('component', name, 'cannot load properly')
  if (script && script.match(/require\s*\(/) && !script.match(/electron-require/)) {
    console.error(`in component "${name}" replace require with await import()`)
    script = false
  }
  try {
    load = script
      ? new AsyncFunction(
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
      )
      : false
  } catch (e) {
    console.error('error creating load method for component', name, e, script)
    throw new Error(`component ${name} load method could not be created`)
  }
  /* jshint evil: false */
  const className = `${name}-component`
  const style = css ? makeStylesheet(css.replace(/_component_/g, className), className) : false
  const updateClasses = elt => elt.setAttribute('class', elt.getAttribute('class').replace(/_component_/g, className))
  findWithin(div, '[class*="_component_"]').forEach(updateClasses)
  const component = {
    name,
    style,
    view: div,
    load,
    path: url.split('/').slice(0, -1).join('/')
  }
  if (component.path === 'undefined') {
    debugger // eslint-disable-line no-debugger
  }
  if (preserveSource) {
    component._source = source
  }
  if (componentTimeouts[name]) {
    clearInterval(componentTimeouts[name])
  }
  if (components[name]) {
    // don't want to leak stylesheets
    if (components[name].style) {
      components[name].style.remove()
    }
    console.warn('component %s has been redefined', name)
  }
  components[name] = component

  find(`[data-component="${name}"]`).forEach(element => {
    // somehow things can happen in between find() and here so the
    // second check is necessary to prevent race conditions
    if (!element.closest('[data-list]') && element.dataset.component === name) {
      asyncUpdate(false, element)
    }
  })
  return component
}

// path/to/../foo -> path/foo
const collapse = path => {
  while (path.match(/([^/]+\/\.\.\/)/)) {
    path = path.replace(/([^/]+\/\.\.\/)/g, '')
  }
  return path
}

/**
~~~~
Test(async () => {
  const {name} = await b8r.component('../test/custom-test.html')
  b8r.componentOnce('custom-test')
  return name
}).shouldBe('custom-test')
~~~~
*/

const component = (name, url, preserveSource = false) => {
  if (url === undefined) {
    url = name
    name = url.split('/').pop().split('.').shift()
  }
  if (!componentPromises[name] || preserveSource) {
    if (!url) throw new Error(`expected component ${name} to be defined`)
    url = collapse(url)
    componentPromises[name] = new Promise(function (resolve, reject) {
      if (components[name] && !preserveSource) {
        resolve(components[name])
      } else {
        const finalUrl = url.match(/\.\w+$/) ? url : `${url}.component.html`
        componentPreloadMap[name] = finalUrl
        ajax(finalUrl)
          .then(source => resolve(makeComponent(name, source, url, preserveSource)))
          .catch(err => {
            delete componentPromises[name]
            console.error(err, `failed to load component ${url}`)
            reject(err)
          })
      }
    })
  }
  return componentPromises[name]
}

export {
  component,
  components,
  componentTimeouts,
  componentPreloadMap,
  makeComponent,
  makeComponentNoEval
}
