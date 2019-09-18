/**
# web-components.js

Helper methods for creating Web Components.

## Methods

### makeWebComponent

    makeWebComponent(tagName, {
      superClass=HTMLElement, // the class you're extending
      style=false,            // expect object
      methods={},             // map names to class methods
      eventHandlers={},       // map eventTypes to event handlers
      attributes={},          // map attributes to default values
      content=slot(),         // HTMLElement or DocumentFragment or falsy
      ariaRole=false,         // expect string
    })                        // returns the class

Defines a new [Web Component](https://www.webcomponents.org/)).

Returns the component class (in case you want to subclass it).

- `style` can be CSS source or a map of selector rules to maps of css rules.
  If no style is passed, no shadowRoot will be created
- `methods` will become class methods, notably `render` and `childListChange`
  - `render` is where the widget gets expressed in the DOM, based on its state
  - `childListChange` indicates that children of the (original) DOM node have changed
- `eventHandlers` will be bound to the DOM element (i.e. `this` will refer to the
  expected instance)
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
- `ariaRole` will do the expected thing
- by default, setting the `hidden` attribute will hide a styled component (this is
  implemented via styles), not attributes, so there's no MutationObserver oberhead.

The class has a single static method, `defaultAttributes()` which returns (shockingly)
the a clone of the `atrributes` array used to construct the component. This is useful
for introspection (e.g. if you're building a UI builder that needs to know what attributes
a given custom element has).

#### Component Lifecycle

makeComponent copies all methods provided into the component's prototype, so the
standard lifecycle methods `connectedCallback`, `disconnectedCallback`,
`adoptedCallback`, and `attributeChangedCallback` work as normal.

#### Performance Notes

The "lightest" web-components have no `style` (and hence no shadowDOM) or `attributes`.
- supporting attributes involves creating a MutationObserver, which has an overhead.
- adding a `style` object has a larger perf overhead.

Even so, in general web-components should perform better than components implemented using
Javascript frameworks (including `b8r` components).

More information is provided in [this blog entry](http://loewald.com/blog/2019/01/more-on-web-components-and-perf/).

### makeElement

    const makeElement = (tagType, {
      content=false,  // text, or something that can be appended to an HTMLElement
      attributes={},  // attribute map
      styles={},      // style object
      classes=[],     // list of classes
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

### Example

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

## TODO

- Resize events
- Component styling scope (see below)

## Recommended Reading

### Best Practices

I do not follow these slavishly (some I flat out disagree with) but include them for
reference purposes.

- [Custom Elements Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)
- [Web Components Best Practices](https://www.webcomponents.org/community/articles/web-components-best-practices)

### Styling

- [Styling a Web Component](https://css-tricks.com/styling-a-web-component/)

The above is more of a "how to" than best practices. I'm still trying to figure
out best practices myself. Right now, I'd say that **the best way to style
web-components is as little as possible** -- unless they're actual views
(and my jury is out on whether building views as web-components is at all a
good idea).

Creating components with minimal styling and no shadowDOM is another possibility.
Instead of creating an internal style node, they could simply insert a singleton
stylesheet in the `<header>` the way `b8r` components do.

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
  ariaRole = false // expect string
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
      Object.assign(this, props)
      if (styleNode) {
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.appendChild(styleNode.cloneNode(true))
        appendContentToElement(shadow, content)
      } else {
        appendContentToElement(this, content)
      }
      Object.keys(eventHandlers).forEach(eventType => {
        this.addEventListener(eventType, eventHandlers[eventType].bind(this))
      })
      if (ariaRole) this.setAttribute('aria-role', ariaRole)
      const attributeNames = Object.keys(attributes)
      if (eventHandlers.childListChange) {
        const observer = new MutationObserver(eventHandlers.childListChange.bind(this))
        observer.observe(this, { childList: true })
      }
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
            writeable: true,
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

    static defaultAttributes () {
      return { ...attributes }
    }
  }

  Object.keys(methods).forEach(methodName => {
    componentClass.prototype[methodName] = methods[methodName]
  })

  // if-statement is to prevent some node-based "browser" tests from breaking
  if (window.customElements) window.customElements.define(tagName, componentClass)

  return componentClass
}

const dispatch = (target, type) => {
  const event = new Event(type)
  target.dispatchEvent(event)
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
