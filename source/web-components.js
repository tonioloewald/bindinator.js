/**
# Custom Elements
<h2 style="margin-top: -10px">a.k.a web-components</h2>

> ## Confused?
>
> This document has been retitled _Custom Elements_ to make a clearer distinction between
> documentation on `b8r` _components_ and _web-components_. Nothing has changed under the
> hood. The terms "web-component" and "custom element" are used interchangeably here, and
> everywhere else.
>
> Just to add to the confusion, `b8r` components are themselves instances of a custom
> element `<b8r-component>`.

This library provides helper functions for creating [Custom Elements](https://www.webcomponents.org/).
The terms "web-component" and "custom element" are used interchangeably everywhere.

## Example

```
// you cannot redefine an existing web-component so we need a unique name for refreshes
const componentName = 'simple-button-' + b8r.unique()
const {makeWebComponent, div} = b8r.webComponents
const elt = b8r.create(componentName)
elt.textContent = 'Click Me'
makeWebComponent(componentName, {
  style: {
    ':host': {
      cursor: 'default',
      display: 'inline-block',
      borderRadius: '4px',
      background: '#55f',
      color: 'white',
      padding: '5px 10px',
    },
    ':host(:hover)': {
      background: '#44e',
    },
    ':host(:active)': {
      background: '#228',
    },
  },
  methods: {
    onAction() {
      alert(this.textContent + ' was clicked')
    },
    render () {
      this.onclick = this.onAction
    }
  }
})
example.append(elt)
```

## Methods

### makeWebComponent

    // where appropriate, default values are shown
    makeWebComponent('tag-name', {
      superClass: undefined,   // the class you're extending, if any
      style: false,            // expect object
      props: {},               // map names to default values / functions
      methods: {},             // map names to class methods
      eventHandlers: {},       // map eventTypes to event handlers
      attributes: {},          // map attributes to default values
      content: slot(),         // HTMLElement or DocumentFragment or falsy
      role: false,             // expect string
    })                        // returns the class

Defines a new _custom element_.

Returns the component `class` (in case you want to subclass it, use the constructor
for comparison, or whatever).

- `style` can be CSS source or a map of selector rules to maps of css rules.
  If no style is passed, no shadowRoot will be created
- `props` are direct properties added to the element; if you pass a function
  then if it takes no parameters a computed read-only property of that name
  will map to the function. If the function takes a parameter, it will
  be treated as a computed setter as well. Unlike attributes, props don't
  appear in the DOM.
- `methods` will become class methods, notably `render`
  - `render` is where the widget gets expressed in the DOM, based on its state
    it will fire automatically when a value or attribute changes
- `eventHandlers` will be bound to the DOM element (i.e. `this` will refer to the
  expected instance)
  - the usual events work as expected (e.g. `click`, `mouseleave`)
  - `onConnectedCallback` will be called by the parent class at the right time
  - `childListChange` will be called when something inside the element is changed
  - `resize` will be called when the element changes size (which is triggered by a
    ResizeObserver) -- you may want to throttle your handler
- `attributes` will be converted into object setters and getters.
  - the default value is assumed to be the correct type (if string or number);
    for any other type (e.g. null or an object) the value is preserved as an element
    property and not reflected in the DOM, and if an attribute is found, it's treated
    as JSON.
  - `value` is treated like any other attribute
    - boolean values are encoded by the value attribute being present or absent
    - when `value` is changed, a change event is triggered
  - a DOM mutation observer will automatically update the element (i.e. the `render`
    method will fire if the attributes are changed).
  - **Note**: if you specify any attributes, a `MutationObserver` will be created
    to trigger `render()` when attributes are changed.
  - a boolean attribute will be reflected as a boolean attribute in the DOM (e.g.
    the way `disabled` works).
- `content` will default to being a `<slot>` (pass explicit `false` or content that
  explicitly does not include a `<slot>` element and you'll create a sealed element,
  i.e. an element that ignores its content).
  - you can be lazy and pass a string to content (it will become a `TextNode`) or
    an array of `HTMLElement` and (you can wrap them in a `DocumentFragment` but
    you don't have to).
- `role` will do the expected thing
- by default, setting the `hidden` attribute will hide a styled component (this is
  implemented via styles), not attributes, so there's no MutationObserver oberhead.

The class has a single static method, `defaultAttributes()` which returns (shockingly)
the a clone of the `atrributes` array used to construct the component. This is useful
for introspection (e.g. if you're building a UI builder that needs to know what attributes
a given custom element has).

### Component Lifecycle

makeComponent copies all methods provided into the component's prototype, so the
standard lifecycle methods `connectedCallback`, `disconnectedCallback`,
`adoptedCallback`, and `attributeChangedCallback` work as normal, with one minor
caveat — this library creates component classes with a default `connectedCallback`
that will call any `connectedCallback` passed as a method afterwards.

### Performance Notes

The "lightest" web-components have no `style` (and hence **no shadowDOM**) or `attributes`.
- supporting attributes involves creating a `MutationObserver`, which has an overhead.
- adding a `style` object has a larger perf overhead.

Even so, in general web-components should perform better than components implemented using
Javascript frameworks. Well, not `b8r` components, at least at time of writing, but
the great thing about using native browser functionality is that it generally just
gets _faster_. Which gets us to...

### The Shadow DOM

You've heard of it, right? It can be fantastically useful (it's useful for creating
structural behavior that is immune to the outside world, such as dialog boxes and
floating elements) but it's also a huge performance issue if you have too many of
them around (I imagine that the overhead is some fraction of an `<iframe>`...).

More information is provided in [this blog entry](http://loewald.com/blog/2019/01/more-on-web-components-and-perf/).

### makeElement

    const makeElement = (tagType, {
      content: false,  // text, or something that can be appended to an HTMLElement
      attributes: {},  // attribute map
      styles: {},      // style object
      classes: [],     // list of classes
    })                // returns the element

A handy method for creating a DOM element with specified properties. Content can
be an `HTMLElement` or `DocumentFragment` or a string (which is converted to a text
node).

If you want to create a reusable element 'factory' you can simply write
something like:

    const div = (settings={}) => makeElement('div', settings);

This is how the convenience methods below were created, and affords lightweight
rendering of DOM structures in vanilla javascript without requiring transpilation, etc.

E.g. instead of writing this:

    import {styled} from "styletron-react";
    const StyledElement = styled('div', {
      ... css stuff ...
    });
    ...
    <StyledElement>
      <div></div>
      <div></div>
      <div></div>
    </StyledElement>

…and relying on transpilation, you can write:

    import {makeElement, div} from "web-components";
    const styledElement = makeElement('div', {
      styles: {
        ... css stuff ...
      }
    });
    ...
    styledElement({ content: [div(), div(), div()] });

…and it will work transparently in any modern browser.

### dispatch

The recommended way for custom-elements to notify the rest of the world that
they've changed in some way is by triggering events.

    dipatch(target, type) // triggers an event of type on the target element

### div, span, input, slot

These are convenience methods wrapped around makeElement, so instead of writing:

    makeElement('span', {...});

You can write:

    span({...}); // and the object is optional, so span() works too.

### fragment

    fragment(...elements)

Creates a document fragment containing the elements passed to it.

#### Example

This is from an older version of the `<b8r-select>` control:

    fragment(
      makeElement('div', {classes: ['selection']}),
      makeElement('div', {content: '▾', classes: ['indicator']}),
      makeElement('div', {classes: ['menu'], content: makeElement('slot', {})}),
    )

Convenience methods allow this to be simplified to:

    fragment(
      div({classes: ['selection']}),
      div({content: '▾', classes: ['indicator']}),
      div({classes: ['menu'], content: slot()}),
    )

If you build multiple similar elements and want to reuse them, don't forget
to `cloneNode(true)` something you want another copy of.

## TODO

- Provide the option of inserting a stylesheet when the first component instance is inserted
  into the DOM (see below) as an alternative to using the shadow DOM or being unstyled.
- Migrate all style customization in library components to css-variables with sane defaults.

### Styling

In my opinion, the best way to style custom elements in a way that allows easy
customization is to use [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties).
(**Note**: this was controversial when I wrote it, and now seems to be accepted wisdom. Yay!)

- [Styling a Web Component](https://css-tricks.com/styling-a-web-component/)

The above is more of a "how to" than best practices. Take it with a grain of salt.

I think the jury is out on whether creating _complex views_ as web-components is a good
idea. (Angular does this under the hood and it's torpid, but that might just be Angular.)
So far, creating views with `b8r` components seems much simpler, quicker, and
more flexible. `b8r` components themselves are implemented as instances of the
`<b8r-component>` custom element. That said, creating complex views using
precompilers (e.g. [TypeScript with .jsx support](https://www.typescriptlang.org/docs/handbook/jsx.html))
the way Google's [litElement](https://lit-element.polymer-project.org/)
does may potentially make web-components easier to write.

Creating components with minimal styling and no shadowDOM is another possibility.
Instead of creating an internal style node, they could simply insert a singleton
stylesheet in the `<header>` the way `b8r` components do.

## Recommended Reading

### Best Practices

I do not follow these slavishly (some I flat out disagree with) but include them for
reference purposes.

- [Custom Elements Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)
- [Web Components Best Practices](https://www.webcomponents.org/community/articles/web-components-best-practices)

### Other Resources

- [Polymer Project](https://www.polymer-project.org/), the source of
  [litElement](https://lit-element.polymer-project.org/) et al
- [webcomponents.org](https://www.webcomponents.org/libraries) strives to be a portal to
  the world of custom-elements, but so far is not inspiring.

*/
/* global Event, MutationObserver, HTMLElement, requestAnimationFrame */

const makeElement = (tagType, {
  content = false,
  attributes = {},
  styles = {},
  classes = []
}) => {
  const elt = document.createElement(tagType)
  appendContentToElement(elt, content)
  Object.keys(attributes).forEach((attributeName) => elt.setAttribute(attributeName, attributes[attributeName]))
  Object.keys(styles).forEach((styleName) => {
    elt.style[styleName] = styles[styleName]
  })
  classes.forEach((className) => elt.classList.add(className))
  return elt
}

const dispatch = (target, type) => {
  const event = new Event(type)
  target.dispatchEvent(event)
}

/* global ResizeObserver */
const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const element = entry.target
    dispatch(element, 'resize')
  }
})

const button = (settings = {}) => makeElement('button', settings)
const div = (settings = {}) => makeElement('div', settings)
const input = (settings = {}) => makeElement('input', settings)
const label = (settings = {}) => makeElement('label', settings)
const slot = (settings = {}) => makeElement('slot', settings)
const span = (settings = {}) => makeElement('span', settings)
const text = s => document.createTextNode(s)

const appendContentToElement = (elt, content) => {
  if (content) {
    if (typeof content === 'string') {
      elt.textContent = content
    } else if (Array.isArray(content)) {
      content.forEach(node => {
        elt.appendChild(node.cloneNode ? node.cloneNode(true) : text(node))
      })
    } else if (content.cloneNode) {
      elt.appendChild(content.cloneNode(true))
    } else {
      throw new Error('expect text content or document node')
    }
  }
}

const fragment = (...elements) => {
  const container = document.createDocumentFragment()
  elements.forEach(element => container.appendChild(element.cloneNode(true)))
  return container
}

const _hyphenated = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase())

const _css = (obj) => {
  if (typeof obj === 'object') {
    const selectors = Object.keys(obj).map((selector) => {
      const body = obj[selector]
      const rule = Object.keys(body)
        .map((prop) => `  ${_hyphenated(prop)}: ${body[prop]};`)
        .join('\n')
      return `${selector} {\n${rule}\n}`
    })
    return selectors.join('\n\n')
  } else {
    return obj
  }
}

const makeWebComponent = (tagName, {
  superClass = HTMLElement, // the class you're exetending
  value = false, // expect boolean
  style = false, // expect object
  methods = {}, // map names to functions
  eventHandlers = {}, // map eventTypes to event handlers
  props = {}, // map of instance properties to defaults
  attributes = {}, // map attributes to default values
  content = slot(), // HTMLElement or DocumentFragment
  role = false // expect string
}) => {
  let styleNode = null
  if (style) {
    style = Object.assign({ ':host([hidden])': { display: 'none !important' } }, style)
    styleNode = makeElement('style', { content: _css(style) })
  } else if (style) {
    console.error(`style for a web-component ${tagName} with now shadowRoot is not supported`)
  }
  if (methods.render) {
    methods = Object.assign({
      queueRender (change = false) {
        if (!this._changeQueued) this._changeQueued = change
        if (!this._renderQueued) {
          this._renderQueued = true
          requestAnimationFrame(() => {
            if (this._changeQueued) dispatch(this, 'change')
            this._changeQueued = false
            this._renderQueued = false
            this.render()
          })
        }
      }
    }, methods)
  }

  const componentClass = class extends superClass {
    constructor () {
      super()
      for (const prop of Object.keys(props)) {
        const value = props[prop] // local copy that won't change
        Object.defineProperty(this, prop, {
          enumerable: false,
          get () {
            return typeof value === 'function' ? value.apply(this) : value
          },
          set () {
            throw new Error('cannot set read-only prop')
          }
        })
      }
      if (styleNode) {
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.appendChild(styleNode.cloneNode(true))
        appendContentToElement(shadow, content)
      } else {
        appendContentToElement(this, content)
      }
      Object.keys(eventHandlers).forEach(eventType => {
        const passive = eventType.startsWith('touch') ? { passive: true } : false
        this.addEventListener(eventType, eventHandlers[eventType].bind(this), passive)
      })
      if (eventHandlers.childListChange) {
        const observer = new MutationObserver(eventHandlers.childListChange.bind(this))
        observer.observe(this, { childList: true })
      }
      const attributeNames = Object.keys(attributes)
      if (attributeNames.length) {
        const attributeValues = {}
        const observer = new MutationObserver((mutationsList) => {
          let triggerChange = false
          let triggerRender = false
          mutationsList.forEach((mutation) => {
            triggerChange = mutation.attributeChange === 'value'
            triggerRender = triggerRender || triggerChange || attributeNames.includes(mutation.attributeName)
          })
          if (triggerRender && this.queueRender) this.queueRender(triggerChange)
        })
        observer.observe(this, { attributes: true })
        attributeNames.forEach(attributeName => {
          Object.defineProperty(this, attributeName, {
            enumerable: false,
            get () {
              if (typeof attributes[attributeName] === 'boolean') {
                return this.hasAttribute(attributeName)
              } else {
                if (this.hasAttribute(attributeName)) {
                  return typeof attributes[attributeName] === 'number'
                    ? parseFloat(this.getAttribute(attributeName))
                    : this.getAttribute(attributeName)
                } else if (attributeValues[attributeName] !== undefined) {
                  return attributeValues[attributeName]
                } else {
                  return attributes[attributeName]
                }
              }
            },
            set (value) {
              if (typeof attributes[attributeName] === 'boolean') {
                if (value !== this[attributeName]) {
                  if (value) {
                    this.setAttribute(attributeName, '')
                  } else {
                    this.removeAttribute(attributeName)
                  }
                  if (this.queueRender) this.queueRender(attributeName === 'value')
                }
              } else if (typeof attributes[attributeName] === 'number') {
                if (value !== parseFloat(this[attributeName])) {
                  this.setAttribute(attributeName, value)
                  if (this.queueRender) this.queueRender(attributeName === 'value')
                }
              } else {
                if (typeof value === 'object' || `${value}` !== `${this[attributeName]}`) {
                  if (value === null || value === undefined || typeof value === 'object') {
                    this.removeAttribute(attributeName)
                  } else {
                    this.setAttribute(attributeName, value)
                  }
                  attributeValues[attributeName] = value
                  if (this.queueRender) this.queueRender(attributeName === 'value')
                }
              }
            }
          })
        })
      }
      if (this.queueRender) this.queueRender()
    }

    connectedCallback () {
      // super annoyingly, chrome loses its shit if you set *any* attributes in the constructor
      if (role) this.setAttribute('role', role)
      if (eventHandlers.resize) {
        observer.observe(this)
      }
      if (methods.connectedCallback) methods.connectedCallback.call(this)
    }

    disconnectedCallback () {
      observer.unobserve(this)
    }

    static defaultAttributes () {
      return { ...attributes }
    }
  }

  Object.keys(methods).forEach(methodName => {
    if (methodName !== 'connectedCallback') {
      componentClass.prototype[methodName] = methods[methodName]
    }
  })

  // if-statement is to prevent some node-based "browser" tests from breaking
  if (window.customElements) window.customElements.define(tagName, componentClass)

  return componentClass
}

export {
  fragment,
  makeElement,
  makeWebComponent,
  div,
  slot,
  input,
  button,
  label,
  span,
  text,
  dispatch
}
