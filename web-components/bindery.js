/**
# bindery

This is a simple experimental component for binding a model to the DOM. 
You assign an object to the `<bindery-model>`'s `value` and then bind to its 
(top-level) properties by name.

For example:

```
<bindery-model events="mouseup">
  <h4>Simple Binding</h4>
  <button data-on="mouseup=click" data-to="textContent=caption"></button>
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
</bindery-model>
<script>
  require('web-components/bindery.js');
  document.querySelector('bindery-model').value = {
    caption: 'an example',
    click () {
      alert(`you clicked "${this.value.caption}"`)
    },
    save (evt) {
      const caption = evt.target.previousElementSibling.value;
      this.value = Object.assign(this.value, {caption});
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
integrated, then a `<bindery-model>` element would function as a standalone 
`b8r`-like context.

Similarly, it would be easy enough to make the `data-from` bindings inactive by
default (essentially giving you a redux-like data-flow) or simply not support them
at all.
*/

const {
  makeWebComponent,
} = require('../lib/web-components.js');

const BinderyModel = makeWebComponent('bindery-model', {
  value: true,
  attributes: {
    events: '',
  },
  methods: {
    get(path) {
      return this.value[path];
    },
    handleEvent(evt) {
      const bindery = evt.target.closest('bindery-model');
      const model = bindery.value;
      const {type, target} = evt;
      const eventTarget = target.closest(`[data-on*="${type}"]`);
      if (eventTarget) {
        const handler = eventTarget.dataset.on.split('=').pop();
        model[handler].call(bindery, evt, eventTarget, model);
      }
    },
    handleChange(evt) {
      const bindery = evt.target.closest('bindery-model');
      const {type, target} = evt;
      const changeTarget = target.closest(`[data-from]`);
      if (changeTarget) {
        const [target, path] = changeTarget.dataset.from.split('=');
        bindery.value = Object.assign(bindery.value, {[path]: changeTarget[target]})
      }
    },
    render() {
      const slot = this.shadowRoot.querySelector('slot');
      this.events.split(',').forEach(type => slot.addEventListener(type, this.handleEvent, {capture:true}));
      ['change', 'input'].forEach(type => slot.addEventListener(type, this.handleChange, {capture:true}));
      const model = this.value;
      if (model) {
        const subscribers = this.querySelectorAll('[data-to],[data-from]');
        subscribers.forEach(elt => {
          const [prop, path] = (elt.dataset.to || elt.dataset.from).split('=');
          elt[prop] = model[path];
        });
      }
    }
  },
});

module.exports = {
  BinderyModel,
}