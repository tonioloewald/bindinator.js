/**
# object

Provides `<b8r-object>`, an element for displaying objects.

It provides a straightforward value (instead of having to worry about `checked`).

```
<style>
  ._component_ label > span {
    color: var(--dark-accent-color);
  }
  b8r-scalar {
    display: block;
    padding: 2px 5px;
    border-bottom: 1px solid var(--bright-accent-color);
  }
  b8r-object {
    display: block;
  }
  b8r-list b8r-object {
    display: flex;
  }
</style>
<h4>scalar</h4>
<b8r-scalar caption="test caption" value="test value"></b8r-scalar>

<h4>list</h4>
<b8r-list data-bind="value=_component_.obj.array"></b8r-list>

<h4>list with keys</h4>
<b8r-list data-bind="value=_component_.obj.table" keys="name,email"></b8r-list>

<h4>object</h4>
<b8r-object data-bind="value=_component_.obj"></b8r-object>
<script>
  await import('../web-components/object.js');
  const obj = {
    number: 17,
    string: 'hello, world',
    boolean: true,
    "null": null,
    "undefined": undefined,
    array: [
      { string: "fred" },
      { number: Math.PI },
    ],
    table: [
      { id: 1, name: 'foo', email: 'foo@abc.com' },
      { id: 2, name: 'bar', email: 'bar@cde.com' },
      { id: 3, name: 'baz', email: 'baz@fgh.com' }
    ]
  }
  set({obj});
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/object.js', 'b8r-object', 'b8r-list', 'b8r-scalar')
~~~~
*/

import {
  span,
  label,
  makeElement,
  makeWebComponent
} from '../source/web-components.js'

const objectNode = (settings = {}) => makeElement('b8r-object', settings)
const scalarNode = (settings = {}) => makeElement('b8r-scalar', settings)
const listNode = (settings = {}) => makeElement('b8r-list', settings)

export const scalar = makeWebComponent('b8r-scalar', {
  attributes: {
    caption: '',
    value: null
  },
  content: null,
  methods: {
    connectedCallback () {
      if (this.children.length > 0) return
      this.appendChild(label({ content: [span(), objectNode()] }))
    },
    render () {
      const {
        caption,
        value
      } = this
      if (!this.firstElementChild) return
      const [_caption, _object] = this.firstElementChild.childNodes
      _caption.textContent = caption
      _object.value = value
    }
  }
})

export const list = makeWebComponent('b8r-list', {
  attributes: {
    value: null,
    keys: null
  },
  content: false,
  methods: {
    render () {
      const { value, keys } = this
      while (this.childNodes.length > (value || []).length) {
        console.log('removing child')
        this.removeChild(this.lastChild)
      }
      if (!value || value.length === 0) return
      while (value.length > this.childNodes.length) {
        this.appendChild(objectNode())
      }
      for (let i = 0; i < value.length; i++) {
        this.childNodes[i].value = value[i]
        this.childNodes[i].keys = keys
      }
    }
  }
})

export const object = makeWebComponent('b8r-object', {
  attributes: {
    value: null,
    keys: null
  },
  content: false,
  methods: {
    render () {
      const { value, keys } = this

      if (Array.isArray(value)) {
        if (this.children.length === 0 || this.firstElementChild.tagName !== 'B8R-LIST') {
          this.textContent = ''
          this.appendChild(listNode())
        }
        this.firstElementChild.value = value
      } else if (typeof value !== 'object') {
        this.textContent = value
      } else {
        let _keys
        if (!keys) {
          _keys = Object.keys(value || {})
        } else if (typeof keys === 'string') {
          _keys = keys.split(',')
        } else if (Array.isArray(keys)) {
          _keys = keys
        } else {
          throw new Error(`b8r-object expects keys to be comma-delimited string or Array (received ${typeof keys})`)
        }
        while (this.children.length > _keys.length) {
          this.removeChild(this.lastChild)
        }
        while (_keys.length > this.children.length) {
          this.appendChild(scalarNode())
        }

        for (let i = 0; i < _keys.length; i++) {
          const key = _keys[i]
          this.children[i].caption = key
          this.children[i].value = value[key] || ''
        }
      }
    }
  }
})
