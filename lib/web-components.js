/**
# web-components.js

Helper methods for creating Web Components.

## Methods

### makeWebComponent

    makeWebComponent(tagName, {
      superClass=HTMLElement, // the class you're exetending
      value=false,            // expect boolean
      style=false,            // expect object
      methods={},             // map names to functions
      eventHandlers={},       // map event_types to event handlers
      attributes={},          // map attributes to default values
      content=_slot,          // HTMLElement or DocumentFragment
      ariaRole=false,         // expect string
    })                        // returns the class

Defines a new [Web Component](https://www.webcomponents.org/)).

Returns the component class (in case you want to subclass it).

- `value` whether or not the element supports a value..
- `style` can be CSS source or a map of selector rules to maps of css rules.
- `methods` will become class methods, notably `render`.
- `eventHandlers` will be bound to the DOM element as appropriate.
- `attributes` will be converted into object setters and getters; a DOM mutation
  observer will automatically update the element if the attributes are changed.
- `content` will default to being a slot (pass explicit `false` if you like)
- `ariaRole` will do the expected thing

### makeElement

    const makeElement = (tagType, {
      content=false,  // text, or something that can be appended to an HTMLElemeent
      attributes={},  // attribute map
      styles={},      // style object
      classes=[],     // list of classes
    })                // returns the element

A handy method for creating a DOM element with specified properties. Content can
be an `HTMLElement` or `DocumentFragment` or a string (which is converted to a text node).

### fragment

    fragment(...elements)

Creates a document fragment containing the elements passed to it.

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

const fragment = (...elements) => {
  const container = document.createDocumentFragment();
  elements.forEach(element => container.appendChild(element.cloneNode(true)));
  return container;
};

const _slot = makeElement('slot', {});

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
    attributes={},          // map attributes to default values
    content=_slot,          // HTMLElement or DocumentFragment
    ariaRole=false,         // expect string
}) => {
  const styleNode = style ? makeElement('style', {content: _css(style)}) : false;

  if (!methods.render) methods.render = () => {};

  const componentClass = class extends superClass {
    constructor() {
      super();
      const shadow = this.attachShadow({mode: 'open'});
      if (styleNode) shadow.appendChild(styleNode.cloneNode(true));
      if (content) shadow.appendChild(content.cloneNode(true));
      Object.keys(eventHandlers).forEach(eventType => {
        this.addEventListener(eventType, eventHandlers[eventType].bind(this));
      });
      if (ariaRole) this.setAttribute('aria-role', ariaRole);
      const attributeNames = Object.keys(attributes);
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
}