/**
# tabs

A simple tab component. It shows one of its children at a time and
makes one tab based on the `name` attribute of each child.

The value of the tab component is the index of the currently visible
body.

## TODO

Implement <tab-body> and <tab-button> to allow fine-grained styling
and rich content in tabs, and assignment of specific values to tabs
(versus indices).

```
    <b8r-tab-selector>
      <div name="first" style="padding: 20px">first tab content</div>
      <div name="second" style="padding: 20px">second tab content</div>
    </b8r-tab-selector>
    <script>
      await import('../web-components/tabs.js');
    </script>
```
*/
/* global requestAnimationFrame */

import {
  fragment,
  div,
  span,
  slot,
  makeWebComponent
} from '../lib/web-components.js'

const TabSelector = makeWebComponent('b8r-tab-selector', {
  attributes: {
    value: 0
  },
  style: {
    ':host': {
      display: 'flex',
      flexDirection: 'column'
    },
    slot: {
      position: 'relative',
      display: 'block',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '2px',
      flexGrow: 1
    },
    '.tabs': {
      borderColor: '#ccc',
      padding: '5px 5px 0 5px',
      display: 'flex',
      flexShrink: 0
    },
    '.tabs > span': {
      flex: '1 1 auto',
      whitespace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      background: '#ddd',
      padding: '5px 10px',
      borderRadius: '5px 5px 0 0',
      border: '1px solid #ccc',
      borderBottom: '1px solid transparent',
      cursor: 'default',
      margin: '-1px'
    },
    '.tabs > .selected': {
      background: 'white',
      zIndex: '2',
      border: '1px solid #ccc',
      borderBottom: '1px solid white',
      transform: 'translateY(1px)'
    }
  },
  eventHandlers: {
    childListChange () {
      this.buildTabs()
    }
  },
  methods: {
    onMount () {
      this.buildTabs()
    },
    pickTab (idx) {
      this.value = idx
      const tab = this.shadowRoot.querySelector('.tabs').children[idx]
      requestAnimationFrame(() => tab.focus())
    },
    buildTabs () {
      const tabs = this.shadowRoot.querySelector('.tabs')
      // note that this is explicitly supporting b8r list bindings,
      // but should cause no problems for vanilla js.
      const bodies = [...this.children].filter(body => !body.dataset.list)
      tabs.innerHTML = ''
      bodies.forEach((body, idx) => {
        const tab = span({
          attributes: { tabIndex: 0 },
          content: body.getAttribute('name') || 'untitled'
        })
        body._tab = tab
        tab.addEventListener('keydown', (evt) => {
          switch (evt.code) {
            case 'Space':
              this.pickTab(idx)
              break
            case 'ArrowRight':
              this.pickTab(idx < bodies.length - 1 ? idx + 1 : 0)
              break
            case 'ArrowLeft':
              this.pickTab(idx ? idx - 1 : bodies.length - 1)
              break
          }
        })
        tab.addEventListener('click', () => this.pickTab(idx))
        tabs.appendChild(tab)
      })
      this._bodies = bodies
    },
    render () {
      const value = this.value && this.value <= this._bodies.length
        ? this.value
        : 0
      this._bodies.forEach((body, idx) => {
        const selected = parseInt(idx, 10) === parseInt(value, 10)
        body.style.display = selected ? '' : 'none'
        body._tab.classList.toggle('selected', selected)
      })
    }
  },
  content: fragment(
    div({ classes: ['tabs'] }),
    slot()
  ),
  ariaRole: 'rich text'
})

export {
  TabSelector
}
