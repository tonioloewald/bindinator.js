/**
# tree

This is a general-purpose tree component. To display information about a
given node you need to provide the root element with a `describer` helper
function which can return an `HTMLElement`, `fragment`, or string.

This example simply displays the DOM with a helper function that displays
each element's tagName and classes or the text of text nodes.

```
<style>
  b8r-tree:not([leaf])[disclosed]:before {
    content: '- '
  }
  b8r-tree:not([leaf]):not([disclosed]):before {
    content: '+ '
  }
  b8r-tree > b8r-tree {
    margin-left: 10px;
  }
</style>
<b8r-tree
  data-bind="
    value=_component_.root
    prop(describer)=_component_.describer
  "
  children="childNodes"
></b8r-tree>
<script>
  await import('../web-components/tree.js');
  set({
    root: document.body,
    describer(elt) {
      return elt instanceof HTMLElement
        ? `${elt.tagName} ${elt.getAttribute('class') || ''}`
        : elt
    }
  })
</script>
```
*/
import { makeWebComponent } from '../source/web-components.js'
import { elements } from '../source/elements.js'

const { span, slot, b8rTree } = elements

const Tree = makeWebComponent('b8r-tree', {
  style: {
    ':host': {
      display: 'block',
      cursor: 'default'
    }
  },
  attributes: {
    disclosed: true,
    leaf: false,
    parentProp: 'children',
    childProp: 'children'
  },
  props: {
    value: null,
    describer (f) {
      if (f) {
        this._describer = f
      } else {
        return this._describer
      }
    }
  },
  eventHandlers: {
    click (evt) {
      if (this.value[this.childProp] && this.value[this.childProp].length) {
        this.toggleDisclose()
      }
      evt.stopPropagation()
    }
  },
  methods: {
    connectedCallback () {
      this.showChildren()
    },
    toggleDisclose () {
      // TODO: implement option-clicking to disclose / collapse sub-hierarchy
      this.disclosed = !this.disclosed
      this.showChildren()
    },
    showChildren () {
      const children = this.disclosed ? this.value[this.childProp] || [] : []
      while (this.childNodes.length > children.length) {
        this.removeChild(this.lastChild)
      }
      if (!children || children.length === 0) return
      while (children.length > this.childNodes.length) {
        this.appendChild(b8rTree())
      }
      for (let i = 0; i < children.length; i++) {
        this.childNodes[i].value = children[i]
        this.childNodes[i].describer = this.describer
        this.childNodes.childProp = this.childProp
      }
    },
    render () {
      this.leaf = !this.value[this.childProp] || !this.value[this.childProp].length
      if (this.describer) {
        this.shadowRoot.querySelector('.description').textContent = ''
        this.shadowRoot.querySelector('.description').append(this.describer(this.value))
      }
    }
  },
  content: [
    span(
      span('no description', { class: 'description' })
    ),
    slot()
  ],
  role: 'tree'
})

export {
  Tree
}
