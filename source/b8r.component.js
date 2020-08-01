/**
# Components

Load a component from a specified url (and give it the name specified). If no
name is specified, it will be inferred from the url (the part of the file name
before the first period).

    b8r.component([name,] url)

Load component at `path/to/foo.component.html` and name it 'foo':

    b8r.component('path/to/foo')
    // or
    b8r.component('path/to/foo.component.html')

Load component at `path/to/foo.component.html` and name it 'bar':

    b8r.component('bar', 'path/to/foo')

Load (javascript) component from `path/to/foo.js` and name it 'foo':

    b8r.component('path/to/foo.js')

Load (javascript) component from `path/to/bar.component.js` and name it 'bar':

    b8r.component('path/to/bar.component.js')

`b8r.component(...)` returns a promise of the component once loaded. Components
are not stored in the registry so don't worry about their names conflicting with
registry entries.

**Why would you rename a component?** You might be trying to use components from
different sources that share a name, or you might want to style the same component
differently in different contexts. Any component instance will be given the
class `<component-name>-component`.

As soon as a component is loaded, instances of the component will automatically be
inserted where-ever they were specified.

    b8r.insertComponent(component, element, data);

Insert a component by name or by passing a component record (e.g. promised by
component() or produced by makeComponent)

If no element is provided, insertComponent will be append the instance to `document.body`.

Data will be passed to the component's load method and registered as the
component's private instance data. (Usually data is passed automatically
from parent components or via binding, e.g. `data-path="path.to.data` binds that
data to the component).

    b8r.removeComponent(elt); // removes the component's class and instance and empties the element

If elt has a component in it (i.e. has the attribute `data-component-id`) removes the
element's contents, removes the component-id, and removes any class that ends with '-component'.
Note that `removeComponent` does not preserve children!

## Creating Components Programmatically

Instead of writing `something.component.html` and loading it using `b8r.component`
you can make component's programmatically (i.e. using Javascript) and simply `import()`
the file to load the component.

### Version 2 Components

Version 2 components are pure Javascript and support type-checking. (The latter is
work in progress.) They also do not provide you with `data` as a `load` parameter
(use `get()` instead if you must).

The best way to create components programmatically (and, arguably, the best way to
create components period) is using the new `makeComponent(name, specObject)` syntax.
Unlike the old method, the new version doesn't use `eval` and lints without needing
global declarations.

    export default const componentName = makeComponent('component-name', {
      css: '._component_ > div { color: yellow }',
      html: '<div>this text will be yellow</div>',
      load: async ({
        component, // this is the element that the component is inserted into
        b8r,       // it's b8r!
        find,      // b8r.findWithin(component, ...)
        findOne,   // b8r.findOneWithin(component, ...)
        register,  // replace the component's private data object
        get,       // get (within the component's private data)
        set,       // set (within the component's private data)
        on,        // b8r.on(component, ...)
        touch      // force updates of paths inside the component
      }) => {
        // your javascript goes here
      },
      initialValue: {...},
                   // specify the component's initial value
                   // or you can provide an [async] function
                   // ({b8r, get, set, touch, on, component, findOne, findOneWithin}) => { ... } // return intial value
      type: {...}, // specify the component's type
      instanceType: {...},
                   // specify the component's instance type
    })

All of these properties are optional. `type` and `instanceType` are [by example](?source=source/b8r.byExample.js).

```
<b8r-component name="typed"></b8r-component>
<script>
  b8r.makeComponent('typed', {
    html: `
      <p data-bind="text=_component_.caption"></p>
      <button data-event="click:_component_.typeError">Generates Type Error in Console</button>
      <button data-event="click:_component_.resetCaption">No Type Error</button>
    `,
    load({get, set, data}) {
      set({
        typeError: () => set('caption', 17),
        resetCaption: () => set('caption', 'I\'m a string again!')
      })
    },
    initialValue: {
      caption: 'this is ok',
    },
    type: { caption: 'string' }
  })
</script>
```

You only need to destructure the parameters you want to use (to avoid linter complaints
about unused variables).

```
<b8r-component name="no-eval"></b8r-component>
<script>
  b8r.makeComponent('no-eval', {
    css: '._component_ > span { color: yellow; }',
    html: '<span></span>',
    load: async ({findOne}) => {
      findOne('span').textContent = 'Hello Pure Component'
    }
  })
</script>
```
### Making a Component from HTML Source

This is how `b8r` makes components from `.html` files (and also in its inline "fiddles").

    makeComponent(name, source, url, preserveSource); // preserveSource are optional

Create a component with the specified name, source code, and url. Use preserveSource if
you want the component's source code kept for debugging purposes.

`makeComponent` is used internally by component to create components, and by the documentation
system to create components interactively. In general you won't need to use this method at all.

## `b8r.insertComponent`

You can programmatically insert a component instance thus:

    b8r.insertComponent(component, target, data)

`component` can be a component name or a loaded component definition, while target is
the element you want to insert the element into, and `data` is the initial value of
the component. Only the first argument is required.

If `target` is not provided, a new element is appended to document.body and the
component is inserted into it.

## `b8r.componentOnce`

If you want to make sure there's exactly one instance of a component:

    b8r.componentOnce(url [,name]);

This loads the component (if necessary) and then if there is no instance of the component
in the DOM it creates one. It replaces the pattern:

    b8r.component(url).then(c => b8r.insertComponent(c));

And doesn't run the risk of leaking multiple instances of components into the DOM.

## Composing Components

By default, a component replaces the content of the element it is inserted into.
If a component has an element with the `data-children` attribute then this element
will contain the children of the original element.

```
<b8r-component name="translucent-parent">
  <h2>Hello</h2>
  <b8r-component name="translucent-parent">
    world
  </b8r-component>
</b8r-component>
<script>
    b8r.makeComponent('translucent-parent', {
      css: `._component_ {
        display: block;
        background: rgba(255,0,0,0.1);
      }`,
      html: `<div data-children></div>`
    })
</script>
```

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

If a component has a method named `destroy` it will be called just before the instance
is removed from the registry.
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
const componentTypes = {}

const processComponent = (css, html, name) => {
  const view = create('div')
  view.innerHTML = html || ''
  const className = `${name}-component`
  const style = css ? makeStylesheet(css.replace(/_component_/g, className), className) : false
  for (const elt of findWithin(view, '[class*="_component_"]')) {
    elt.setAttribute(
      'class',
      elt.getAttribute('class').replace(/_component_/g, className)
    )
  }
  return { style, view }
}

const makeComponentNoEval = function (name, { css, html, load, initialValue, type, instanceType }) {
  const {
    style,
    view
  } = processComponent(css, html, name)
  const component = {
    version: 2,
    name,
    style,
    view,
    path: `inline-${name}`,
    initialValue,
    instanceType
  }

  if (type) {
    componentTypes[name] = type
  }

  if (load) {
    // _data and _register are masked because they shouldn't be used any more
    component.load = async (_component, b8r, find, findOne, _data, _register, get, set, on, touch) => {
      load({ component: _component, b8r, find, findOne, get, set, on, touch })
    }
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
  if (components[name]) console.warn('component %s has been redefined', name)
  components[name] = component
  return component
}

const makeComponent = (name, source, url, preserveSource) => {
  if (typeof source === 'object' && url === undefined) {
    return makeComponentNoEval(name, source)
  }
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

  const {
    style,
    view
  } = processComponent(css, content, name)
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
  const component = {
    name,
    style,
    view,
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
// title: component (v1) loading tests
const {name} = await b8r.component('../test/custom-test.html')
Test(async () => {
  return name
}).shouldBe('custom-test')
Test(async () => {
  await b8r.componentOnce('custom-test')
  b8r.findOne('.custom-test-component').style.display = 'none'
  return b8r.find('.custom-test-component').length
}).shouldBe(1)
Test(async () => {
  await b8r.componentOnce('custom-test')
  return b8r.find('.custom-test-component').length
}).shouldBe(1)
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
      } else if (url.match(/\.m?js$/)) {
        import(url).then(exports => {
          if (components[name]) {
            resolve(components[name])
          } else if (exports.default && typeof exports.default === 'object') {
            resolve(makeComponent(name, exports.default))
          } else {
            const err = `cannot define component "${name}", ${url} does not export a component definition as default`
            console.error(err)
            reject(err)
          }
        }).catch(err => {
          delete componentPromises[name]
          console.error(err, `failed to import component ${url}`)
          reject(err)
        })
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
  componentTypes,
  componentTimeouts,
  componentPreloadMap,
  makeComponent,
  makeComponentNoEval
}
