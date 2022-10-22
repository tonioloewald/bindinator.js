/**
# select

Provides `<b8r-select-bar>` and `<b8r-select>` selection widgets, which let the
user pick from among a set of `<b8r-option>` children.

These select components work like a `<select>` but behave more like an input and
can accept a value before they have a corresponding option. (The demo below
intentionally delays the population of the selects until after they've been
assigned a value. When new options appear, the control is refreshed.)

```
<h2>Note</h2>
<p>
  The first select will change to 'a', then two of the three selects
  below will populate after 1s and 2s respectively. This is a test of their correctly
  retaining a value before being populated with the underlying option.
</p>
<b8r-select-bar data-bind="value=_component_.option">
  <b8r-option value="a">A</b8r-option>
  <b8r-option value="b">B</b8r-option>
  <b8r-option value="c">C</b8r-option>
</b8r-select-bar>
<b8r-select data-bind="value=_component_.option">
  <b8r-option data-list="_component_.chars" data-bind="text,value=."></b8r-option>
</b8r-select>
<b8r-select data-bind="value=_component_.page">
  <b8r-option data-list="_component_.nums" data-bind="text,value=."></b8r-option>
</b8r-select>
<script>
  await import('../web-components/select.js');
  set('option', 'b');
  set('page', 1)
  set('nums', [])
  setTimeout(() => set('option', 'a'), 500)
  // this shows that the select copes with values set before
  // the option appears, and renders correctly
  setTimeout(() => set('chars', ["a", "b", "c"]), 1500)
  setTimeout(() => set('nums', [1,2,3,4,5]), 2500)
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/select.js', 'b8r-select-bar', 'b8r-select', 'b8r-option')
~~~~
*/
/* global requestAnimationFrame */

import {
  fragment,
  div,
  slot,
  makeWebComponent
} from '../source/web-components.js'

const rectUnion = (r, s) => {
  const union = {
    left: Math.min(r.left, s.left),
    top: Math.min(r.top, s.top),
    bottom: Math.max(r.bottom, s.bottom),
    right: Math.max(r.right, s.right)
  }

  union.width = union.right - union.left
  union.height = union.bottom - union.top

  return union
}

export const SelectOption = makeWebComponent('b8r-option', {
  attributes: {
    value: '',
    selected: false,
    hover: false
  },
  style: {
    ':host': {
      transition: 'var(--hover-transition)',
      display: 'inline-block',
      padding: '3px 8px',
      height: '100%',
      margin: 0,
      borderRadius: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      font: 'var(--ui-font)',
      textOverflow: 'ellipsis'
    }
  },
  eventHandlers: {
    mouseup (evt) {
      this.parentElement.value = this.value
    },
    mouseenter (evt) {
      this.hover = true
    },
    mouseleave (evt) {
      this.hover = false
    }
  },
  methods: {
    render () {
      if (this.selected) {
        this.style.background = 'var(--selection-color)'
        this.color = 'var(--selected-text-color)'
      } else if (this.hover) {
        this.style.background = 'var(--light-accent-color)'
        this.color = ''
      } else {
        this.style.background = ''
        this.color = ''
      }
      this.tabIndex = 0
    }
  },
  role: 'menuitemradio'
})

export const SelectBar = makeWebComponent('b8r-select-bar', {
  attributes: {
    value: ''
  },
  style: {
    ':host': {
      color: 'var(--faded-text-color)',
      background: 'var(--input-bg-color)',
      display: 'inline-flex',
      alignItems: 'stretch',
      borderRadius: '99px',
      overflow: 'hidden',
      cursor: 'default',
      userSelect: 'none',
      position: 'relative',
      border: '1px solid transparent'
    }
  },
  methods: {
    render () {
      this.style.background = this.background
      this.style.borderColor = this.background
      // x.dataset.list is for b8r list binding support
      const options = [...this.children].filter(x => !x.dataset.list && x.tagName === 'B8R-OPTION')
      options.forEach((option, idx) => {
        option.selected = `${option.value}` === `${this.value}`
      })
    }
  },
  role: 'menu'
})

export const SelectPop = makeWebComponent('b8r-select', {
  attributes: {
    transition: 'var(--hover-transition)',
    open: false,
    width: '100px',
    value: ''
  },
  style: {
    ':host': {
      color: 'var(--faded-text-color)',
      background: 'var(--input-bg-color)',
      display: 'inline-flex',
      position: 'relative',
      cursor: 'default',
      borderRadius: '3px',
      border: '1px solid transparent'
    },
    '.selection': {
      display: 'inline-flex',
      position: 'relative',
      flexGrow: '1',
      overflow: 'hidden'
    },
    '.selection > *': {
      flexGrow: '1'
    },
    '.indicator': {
      padding: '0 4px'
    },
    '.menu': {
      background: 'var(--input-bg-color)',
      display: 'flex',
      position: 'fixed',
      top: 0,
      left: '-1000px',
      zIndex: 100,
      flexDirection: 'column',
      alignItems: 'stretch',
      borderRadius: '2px',
      overflow: 'hidden',
      userSelect: 'none',
      border: '1px solid transparent'
    },
    '.outer': {
      display: 'block',
      position: 'fixed',
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      background: 'transparent'
    }
  },
  eventHandlers: {
    mouseenter (evt) {
      if (evt.target === this) this.open = true
    },
    touchstart (evt) {
      if (evt.target === this) {
        this.open = true
        evt.preventDefault()
      }
    },
    mouseup () {
      requestAnimationFrame(() => {
        this.open = !this.open
      })
    }
  },
  methods: {
    connectedCallback () {
      const select = this
      select._menu = select.shadowRoot.querySelector('.menu')
      select._outer = select.shadowRoot.querySelector('.outer')
      select._outer.addEventListener('mouseleave', (evt) => {
        select.open = evt.relatedTarget === select._menu ||
                      select.contains(evt.relatedTarget)
      })
      select._slot = this.shadowRoot.querySelector('slot')
      select._slot.addEventListener('slotchange', () => this.render())
    },
    render () {
      const selection = this.shadowRoot.querySelector('.selection')
      selection.innerHTML = ''
      selection.style.width = this.width
      this.style.background = this.background
      this.style.borderColor = this.background
      // x.dataset.list is for b8r list binding support
      const options = [...this.children].filter(x => !x.dataset.list && x.tagName === 'B8R-OPTION')
      options.forEach((option, idx) => {
        option.selected = `${option.value}` === `${this.value}`
        if (option.selected) {
          selection.appendChild(option.cloneNode(true))
        }
      })

      if (this.open) {
        const selfRect = this.getBoundingClientRect()
        this._menu.style.display = ''
        this._menu.style.left = selfRect.left + 'px'
        this._menu.style.top = selfRect.bottom + 'px'
        this._menu.style.width = selfRect.width + 'px'

        const menuRect = this._menu.getBoundingClientRect()
        const boundsRect = rectUnion(selfRect, menuRect)

        this._outer.style.display = ''
        this._outer.style.left = (boundsRect.left - 20) + 'px'
        this._outer.style.top = (boundsRect.top - 20) + 'px'
        this._outer.style.width = (boundsRect.width + 40) + 'px'
        this._outer.style.height = (boundsRect.height + 40) + 'px'
      } else {
        if (this._outer) {
          this._outer.style.display = 'none'
          this._menu.style.display = 'none'
        }
      }
    }
  },
  content: fragment(
    div({ classes: ['selection'] }),
    div({ content: '▾', classes: ['indicator'] }),
    div({ classes: ['outer'] }),
    div({ classes: ['menu'], content: slot() })
  ),
  role: 'menu'
})
