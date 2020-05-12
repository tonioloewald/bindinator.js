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
<b8r-tab-selector closeable style="height: 100%">
  <div name="first" style="padding: 20px">first tab content</div>
  <div name="second tab has a very long name" style="padding: 20px">second tab content</div>
  <div name="third" style="padding: 20px">third tab content</div>
</b8r-tab-selector>
<script>
  await import('../web-components/tabs.js');
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/tabs.js', 'b8r-tab-selector')
~~~~
*/
/* global requestAnimationFrame */

import {
  fragment,
  div,
  span,
  slot,
  button,
  makeWebComponent
} from '../source/web-components.js'

const TabSelector = makeWebComponent('b8r-tab-selector', {
  attributes: {
    value: 0,
    closeable: false
  },
  style: {
    ':host': {
      display: 'flex',
      flexDirection: 'column'
    },
    slot: {
      position: 'relative',
      display: 'block',
      background: 'var(--content-bg-color)',
      border: '1px solid var(--black-20)',
      borderRadius: '2px',
      flexGrow: 1
    },
    '.tabs': {
      borderColor: 'var(--accent-color)',
      padding: '5px 5px 0 5px',
      display: 'flex',
      flexShrink: 0,
      position: 'relative'
    },
    '.tabs > span': {
      flex: '1 1 50%',
      display: 'flex',
      maxWidth: '50%',
      color: 'var(--faded-text-color)',
      background: 'var(--light-accent-color)',
      padding: '5px 10px',
      borderRadius: '5px 5px 0 0',
      border: '1px solid var(--black-20)',
      borderBottom: '1px solid transparent',
      cursor: 'default',
      margin: '-1px',
      whiteSpace: 'nowrap'
    },
    '.tabs > span > span': {
      flexGrow: 1,
      whitespace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    '.tabs > span > span+button': {
      border: 0,
      background: 'transparent',
      flexGrow: 0,
      flexShrink: 0,
      margin: '0 -5px',
      opacity: 0.5,
      color: 'var(--text-color)'
    },
    '.tabs > span > span+button:hover': {
      opacity: 1.0
    },
    '.tabs > .selected': {
      color: 'var(--text-color)',
      background: 'var(--content-bg-color)',
      zIndex: '2',
      border: '1px solid var(--black-20)',
      borderBottom: '1px solid var(--content-bg-color)',
      transform: 'translateY(1px)'
    }
  },
  eventHandlers: {
    childListChange () {
      this.buildTabs()
    }
  },
  methods: {
    connectedCallback () {
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
      const attributes = { tabIndex: 0 }
      const closeButtonAttributes = { title: 'close tab' }
      bodies.forEach((body, idx) => {
        const name = body.getAttribute('name') || 'untitled'
        const closeButton = button({ attributes: closeButtonAttributes, content: '×' })
        const content = [span({ content: name }), closeButton]
        const tab = span({ attributes, content })
        body._tab = tab
        tab.addEventListener('keydown', (evt) => {
          switch (evt.code) {
            case 'Space':
              if (evt.composedPath()[0].matches('button')) {
                this.value -= 1
                body.remove()
              } else {
                this.pickTab(idx)
              }
              break
            case 'ArrowRight':
              this.pickTab(idx < bodies.length - 1 ? idx + 1 : 0)
              break
            case 'ArrowLeft':
              this.pickTab(idx ? idx - 1 : bodies.length - 1)
              break
          }
        })
        tab.addEventListener('click', (evt) => {
          if (evt.composedPath()[0].matches('button')) {
            this.value -= 1
            body.remove()
          } else {
            this.pickTab(idx)
          }
        })
        tabs.appendChild(tab)
      })
      this._bodies = bodies
    },
    render () {
      if (!this._bodies) return
      const value = this.value >= 0 && this.value <= this._bodies.length
        ? this.value
        : 0
      const closeButtonDisplay = this.closeable ? '' : 'none'
      this._bodies.forEach((body, idx) => {
        const selected = parseInt(idx, 10) === parseInt(value, 10)
        body.style.display = selected ? '' : 'none'
        body._tab.classList.toggle('selected', selected)
        body._tab.querySelector('button').style.display = closeButtonDisplay
      })
    }
  },
  content: fragment(
    div({ classes: ['tabs'] }),
    slot()
  ),
  role: 'rich text'
})

export {
  TabSelector
}
