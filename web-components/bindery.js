/**
# bindery

This is a simple experimental component for binding a model to the DOM. 
You assign an object to the `<b8r-bindery>`'s `value` and then bind to its 
(top-level) properties by name.

For example:

```
<b8r-bindery events="mouseup">
  <h4>Simple Binding</h4>
  <button data-on="mouseup=alert" data-to="textContent=caption"></button>
  <h4>One-Way Binding</h4>
  <label>
    to-binding
    <input data-to="value=caption"><button data-on="mouseup=save">Save</button>
  </label>
  <h4>Two-Way Binding</h4>
  <label>
    from-binding
    <input data-from="value=caption">
  </label>
</b8r-bindery>
<script>
  require('web-components/bindery.js');
  document.querySelector('b8r-bindery').value = {
    caption: 'an example',
    alert () {
      alert(`you clicked "${this.value.caption}"`)
    },
    save (evt) {
      const caption = evt.target.previousElementSibling.value;
      this.update({...this.value, caption});
    },
  };
</script>
```

Bindery uses `data-on`, `data-to`, and `data-from` attributes to drive its bindings.

- `data-on` binds events to methods by name
- `data-to` sends data to the DOM by name (one-way binding)
- `data-from` syncs data to the DOM by name (two-way binding)

### Ideas

- implement multiple bindings
- implement `toTargets` (and possibly `fromTargets`)
- implement list bindings -- `<bindery-list>`? Contents become template, slot is hidden.
- consider whether to add `byPath` support or keep paths simple (one level deep)

As of now, this is really just a toy. It only allows for one event and one data
binding per element, and it doesn't use `b8r`'s `byPath` library or its `toTargets`
and `fromTargets`. But it's fairly easy to see that if this functionality were
integrated, then a `<b8r-bindery>` element would function as a standalone 
`b8r`-like context.

Similarly, it would be easy enough to make the `data-from` bindings inactive by
default (essentially giving you a redux-like data-flow) or simply not support them
at all.
*/
/* global require, module */

const implicit_event_types = require('../source/b8r.implicit-event-types.js');
const {
  makeWebComponent,
} = require('../lib/web-components.js');

const fromTargets = {
  value(element){
    return element.value;
  },
  text(element) {
    return element.textContent;
  },
};

const toTargets = {
  value(element, value) { 
    element.value = value;
  },
  text(element, value) {
    element.textContent = value;
  },
  attr(element, value, attributeName) {
    if (value !== false) {
      element.setAttribute(attributeName, value);
    } else {
      element.removeAttribute(attributeName);
    }
  },
  prop(element, value, propName) {
    element[propName] = value;
  },
  style(element, value, styleName) {
    element.style[styleName] = value || '';
  },
};

const toBindings = (elt) => {
  const source = (elt.dataset.to || '') + ';' + (elt.dataset.from || '');
  const bindings = source
                    .split(';')
                    .map(x => x.trim())
                    .filter(x => !!x)
                    .split('=')
                    .map(([target, field]) => ({target, field}));
  return bindings;
}

const BinderyModel = makeWebComponent('b8r-bindery', {
  attributes: {
    value: null,
    events: '',
  },
  eventHandlers: {
    change (evt) {
      this.handleChange(evt)
    },
    input (evt) {
      this.handleChange(evt)
    },
  },
  methods: {
    onMount() {
      const slot = this.shadowRoot.querySelector('slot');
      implicit_event_types.forEach(type => slot.addEventListener(type, this.handleEvent, {capture:true}));

      // automatic binding of elements added or modified dynamically
      // but it may be a performance issue
      const observer = new MutationObserver(mutationsList => {
        if(mutationsList.reduce((a, b) => a || !b.attributeName || b.attributeName.match(/^data-to|data-from$/), false)){
          this.updateBindings();
        }
      });
      observer.observe(this, {subtree: true, attributes: true, childList: true});
    },
    get(path) {
      return this.value[path];
    },
    handleEvent(evt) {
      const bindery = evt.target.closest('b8r-bindery') || evt.fromElement;
      const model = bindery.value;
      const {type, target} = evt;
      const eventTarget = target.closest(`[data-on*="${type}"]`);
      if (eventTarget) {
        const handler = eventTarget.dataset.on.split('=').pop();
        model[handler].call(bindery, evt, eventTarget, model);
      }
    },
    handleChange(evt) {
      const {type, target} = evt;
      const changeTarget = target.closest(`[data-from]`);
      if (changeTarget) {
        const [target, path] = changeTarget.dataset.from.split('=');
        this.update({
          ...this.value,
          [path]: changeTarget[target],
        });
      } else if (target === this) {
        this.update(this.value);
      }
    },
    updateBindings() {
      console.log('updating bindings');
      this.subscribers = [...this.querySelectorAll('[data-to],[data-from]')]
        .map(elt => {
          const [prop, path] = (elt.dataset.to || elt.dataset.from).split('=');
          return {prop, path, elt};
        });
      this.update(this.value);
    },
    update(newValue) {
      if (! this.subscribers) this.updateBindings();
      const {subscribers, value} = this;
      let dirty = false;
      Object.keys(newValue).forEach(path => {
        if (newValue[path] !== value[path]) dirty = true;
        subscribers
          .forEach((subscriber) => {
            if (subscriber.path === path && subscriber.elt[subscriber.prop] !== newValue[subscriber.path]) {
              dirty = true;
              subscriber.elt[subscriber.prop] = newValue[subscriber.path];
            }
          });
      });
      if(dirty) this.value = newValue;
    },
    render() {
      const slot = this.shadowRoot.querySelector('slot');
      this.events.split(',')
        .filter(type => type && ! implicit_event_types.includes(type))
        .forEach(type => {
          slot.removeEventListener(type, this.handleEvent, {capture:true});
          slot.addEventListener(type, this.handleEvent, {capture:true});
        });

      this.update(this.value);
    }
  },
});

module.exports = {
  BinderyModel,
}