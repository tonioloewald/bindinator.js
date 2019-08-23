/**
# bindery

This is a simple experimental component for binding a model to the DOM.
You assign an object to the `<b8r-bindery>`'s `value` and then bind to its
(top-level) properties by name.

Bindery has no styling and does not use a shadow DOM.

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
  await import('../web-components/bindery.js');
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
- implement list bindings -- `<bindery-list>`? contents become template, slot is hidden.
- consider whether to add `byPath` support or keep paths simple (one level deep)

As of now, this is really just a toy. It only allows for one event and one data
binding per element, and it doesn't use `b8r`'s `byPath` library or its `toTargets`
and `fromTargets`. But it's fairly easy to see that if this functionality were
integrated, then a `<b8r-bindery>` element would function as a standalone
`b8r`-like context.

Similarly, it would be easy enough to make the `data-from` bindings inactive by
default (essentially giving you a redux-like data-flow) or simply not support them
at all.

~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/bindery.js', 'b8r-bindery')
~~~~
*/
/* global MutationObserver */

import implicitEventTypes from '../source/b8r.implicit-event-types.js'
import { makeWebComponent } from '../source/web-components.js'

/*
const fromTargets = {
  value (element) {
    return element.value
  },
  text (element) {
    return element.textContent
  }
}

const toTargets = {
  value (element, value) {
    element.value = value
  },
  text (element, value) {
    element.textContent = value
  },
  attr (element, value, attributeName) {
    if (value !== false) {
      element.setAttribute(attributeName, value)
    } else {
      element.removeAttribute(attributeName)
    }
  },
  prop (element, value, propName) {
    element[propName] = value
  },
  style (element, value, styleName) {
    element.style[styleName] = value || ''
  }
}

const toBindings = (elt) => {
  const source = (elt.dataset.to || '') + ';' + (elt.dataset.from || '')
  const bindings = source
    .split(';')
    .map(x => x.trim())
    .filter(x => !!x)
    .split('=')
    .map(([target, field]) => ({ target, field }))
  return bindings
}
*/

const BinderyModel = makeWebComponent('b8r-bindery', {
  attributes: {
    value: null,
    events: ''
  },
  eventHandlers: {
    change (evt) {
      this.handleChange(evt)
    },
    input (evt) {
      this.handleChange(evt)
    }
  },
  createShadow: false,
  methods: {
    connectedCallback () {
      if (this._observer) return

      implicitEventTypes.forEach(type => this.addEventListener(type, this.handleEvent, { capture: true }))

      // automatic binding of elements added or modified dynamically
      // but it may be a performance issue
      this._observer = new MutationObserver(mutationsList => {
        if (mutationsList.reduce((a, b) => a || !b.attributeName || b.attributeName.match(/^data-to|data-from$/), false)) {
          this.updateBindings()
        }
      })
      this._observer.observe(this, { subtree: true, attributes: true, childList: true })
    },
    get (path) {
      return this.value[path]
    },
    handleEvent (evt) {
      const bindery = evt.target.closest('b8r-bindery') || evt.fromElement
      const model = bindery.value
      const { type, target } = evt
      const eventTarget = target.closest(`[data-on*="${type}"]`)
      if (eventTarget) {
        const handler = eventTarget.dataset.on.split('=').pop()
        model[handler].call(bindery, evt, eventTarget, model)
      }
    },
    handleChange (evt) {
      const { target } = evt
      const changeTarget = target.closest(`[data-from]`)
      if (changeTarget) {
        const [target, path] = changeTarget.dataset.from.split('=')
        this.update({
          ...this.value,
          [path]: changeTarget[target]
        })
      } else if (target === this) {
        this.update(this.value)
      }
    },
    updateBindings () {
      this.subscribers = [...this.querySelectorAll('[data-to],[data-from]')]
        .map(elt => {
          const [prop, path] = (elt.dataset.to || elt.dataset.from).split('=')
          return { prop, path, elt }
        })
      this.update(this.value)
    },
    update (newValue) {
      if (!this.subscribers) this.updateBindings()
      const { subscribers, value } = this
      let dirty = false
      Object.keys(newValue || {}).forEach(path => {
        if (newValue[path] !== value[path]) dirty = true
        subscribers
          .forEach((subscriber) => {
            if (subscriber.path === path && subscriber.elt[subscriber.prop] !== newValue[subscriber.path]) {
              dirty = true
              subscriber.elt[subscriber.prop] = newValue[subscriber.path]
            }
          })
      })
      if (dirty) this.value = newValue
    },
    render () {
      this.events.split(',')
        .filter(type => type && !implicitEventTypes.includes(type))
        .forEach(type => {
          this.removeEventListener(type, this.handleEvent, { capture: true })
          this.addEventListener(type, this.handleEvent, { capture: true })
        })

      this.update(this.value)
    }
  }
})

export {
  BinderyModel
}
