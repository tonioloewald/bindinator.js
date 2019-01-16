/**
# web-components.js

Helper methods for creating Web Components.

## Methods

### makeWebComponent

    makeWebComponent(tagName, {
      superClass=HTMLElement, // the class you're extending
      value=false,            // expect boolean
      style=false,            // expect object
      methods={},             // map names to class methods
      eventHandlers={},       // map event_types to event handlers
      attributes={},          // map attributes to default values
      content=slot(),         // HTMLElement or DocumentFragment or falsy
      ariaRole=false,         // expect string
    })                        // returns the class

Defines a new [Web Component](https://www.webcomponents.org/)).

Returns the component class (in case you want to subclass it).

- `value` whether or not the element supports a value.
  - when the value is changed (by the control itself or otherwise) a `change` event is triggered
- `style` can be CSS source or a map of selector rules to maps of css rules.
- `methods` will become class methods, notably `render` and `childListChange`
  - `render` is where the widget gets expressed in the DOM, based on its state
  - `childListChange` indicates that children of the (original) DOM node have changed
- `eventHandlers` will be bound to the DOM element as appropriate.
- `attributes` will be converted into object setters and getters; a DOM mutation
  observer will automatically update the element if the attributes are changed.
- `content` will default to being a slot (pass explicit `false` if you like)
- `ariaRole` will do the expected thing

### makeElement

    const makeElement = (tagType, {
      content=false,  // text, or something that can be appended to an HTMLElement
      attributes={},  // attribute map
      styles={},      // style object
      classes=[],     // list of classes
    })                // returns the element

A handy method for creating a DOM element with specified properties. Content can
be an `HTMLElement` or `DocumentFragment` or a string (which is converted to a text node).

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

- Lifecycle support (willMount, didMount, etc.)
- Resize events
- Component scope (see below)

## Recommended Reading

### Best Practices

- [Web Components Best Practices](https://www.webcomponents.org/community/articles/web-components-best-practices)
- [Custom Elements Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)

### Styling

- [Styling a Web Component](https://css-tricks.com/styling-a-web-component/)

The above is more of a "how to" than best practices. I'm still trying to figure
out best practices myself. Right now, I'd say that **the best way to style
web-components is as little as possible** -- unless they're actual views
(and my jury is out on whether building views as web-components is at all a
good idea).

*/
/* global module */

const makeElement = (tagType, {
  content=false, 
  attributes={}, 
  styles={}, 
  classes=[],
}) => {
  const elt = document.createElement(tagType);
  if (content) {
    if (typeof content === 'string') {
      elt.textContent = content;
    } else if (Array.isArray(content)) {
      content.forEach(node => elt.appendChild(node.cloneNode(true)));
    } else if (content.cloneNode) {
      elt.appendChild(content.cloneNode(true));
    } else {
      throw 'expect text content or document node';
    }
  }
  Object.keys(attributes).forEach((attributeName) => elt.setAttribute(attributeName, attributes[attributeName]));
  Object.keys(styles).forEach((styleName) => elt.style[styleName] = styles[styleName]);
  classes.forEach((className) => elt.classList.add(className));
  return elt;
};

const div = (settings={}) => makeElement('div', settings);
const span = (settings={}) => makeElement('span', settings);
const input = (settings={}) => makeElement('input', settings);
const button = (settings={}) => makeElement('button', settings);
const slot = (settings={}) => makeElement('slot', settings);

const fragment = (...elements) => {
  const container = document.createDocumentFragment();
  elements.forEach(element => container.appendChild(element.cloneNode(true)));
  return container;
};

const _hyphenated = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const _css = (obj) => {
  if (typeof obj === 'object') {
    let source = '';
    const selectors = Object.keys(obj).map((selector) => {
      const body = obj[selector];
      const rule = Object.keys(body)
                         .map((prop) => `  ${_hyphenated(prop)}: ${body[prop]};`)
                         .join('\n');
      return `${selector} {\n${rule}\n}`;
    });
    return selectors.join('\n\n');
  } else {
    return obj;
  }
};

const makeWebComponent = (tagName, {
    superClass=HTMLElement, // the class you're exetending
    value=false,            // expect boolean
    style=false,            // expect object
    methods={},             // map names to functions
    eventHandlers={},       // map event_types to event handlers
    props={},               // map of instance properties to defaults
    attributes={},          // map attributes to default values
    content=slot(),          // HTMLElement or DocumentFragment
    ariaRole=false,         // expect string
}) => {
  const styleNode = style ? makeElement('style', {content: _css(style)}) : false;

  if (!methods.render) methods.render = () => {};

  const componentClass = class extends superClass {
    constructor() {
      super();
      Object.assign(this, props);
      const shadow = this.attachShadow({mode: 'open'});
      if (styleNode) shadow.appendChild(styleNode.cloneNode(true));
      if (content) shadow.appendChild(content.cloneNode(true));
      Object.keys(eventHandlers).forEach(eventType => {
        this.addEventListener(eventType, eventHandlers[eventType].bind(this));
      });
      if (ariaRole) this.setAttribute('aria-role', ariaRole);
      const attributeNames = Object.keys(attributes);
      if (eventHandlers.childListChange) {
        const observer = new MutationObserver(eventHandlers.childListChange.bind(this));
        observer.observe(this, {childList: true});
      }
      if (attributeNames.length) {
        const observer = new MutationObserver((mutationsList) => {
          if(mutationsList.reduce((a, b) => a || attributeNames.includes(b.attributeName), false)){
            this.render(); 
          }
        });
        observer.observe(this, {attributes: true});
        attributeNames.forEach(attributeName => {
          Object.defineProperty(this, attributeName, {
            writeable: true,
            enumerable: false,
            get(){ 
              const value = this.getAttribute(attributeName) || attributes[attributeName];
              return typeof attributes[attributeName] === 'string' ? value : JSON.parse(value || 'null');
            },
            set(value){
              if (value === undefined) {
                if(this.hasAttribute(attributeName)) this.removeAttribute(attributeName);
              } else {
                value = typeof attributes[attributeName] === 'string' ? value : JSON.stringify(value);
                if(this.getAttribute(attributeName) !== value) {
                  this.setAttribute(attributeName, value);
                }
              }
            },
          });
        });
      }

      if (value) {
        Object.defineProperty(this, 'value', {
          writeable: value.writeable,
          enumerable: false,
          get(){
            return this._value !== undefined ? this._value : this.getAttribute('value');
          },
          set(x) {
            if (this._value !== `${x}`) {
              this._value = x;
              this.setAttribute('value', x);
              this.dispatchEvent(new Event('change'));
              this.render();
            }
          },
        });
      }

      this.render();
    }
  };

  Object.keys(methods).forEach(methodName => {
    componentClass.prototype[methodName] = methods[methodName];
  });

  window.customElements.define(tagName, componentClass);

  return componentClass;
};

module.exports = {
  fragment,
  makeElement,
  makeWebComponent,
  div,
  slot,
  input,
  button,
  span,
}