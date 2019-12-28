/**
# switch

Provides `<b8r-switch>`, a configurable switch control.

It provides a straightforward value (instead of having to worry about `checked`).

```
    <b8r-switch data-bind="value=_component_.switch"></b8r-switch>
    <span data-bind="text=_component_.switch"></span>
    <script>
      await import('../web-components/switch.js');
      set({switch: true});
    </script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/switch.js', 'b8r-switch')
~~~~
*/
/* global requestAnimationFrame */

import {
  span,
  makeWebComponent
} from '../source/web-components.js'

const CheckboxSwitch = makeWebComponent('b8r-switch', {
  attributes: {
    color: 'var(--faded-bg-color)',
    onColor: 'var(--accent-color)',
    transition: 'var(--hover-transition)',
    thumbColor: 'var(--text-color)',
    width: '36px',
    height: '16px',
    thumbSize: '24px',
    disabled: false,
    value: false
  },
  style: {
    ':host': {
      position: 'relative',
      display: 'none',
      borderRadius: '99px',
      cursor: 'default'
    },
    '.thumb': {
      position: 'absolute',
      display: 'block',
      borderRadius: '99px',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
    }
  },
  content: span({ classes: ['thumb'] }),
  eventHandlers: {
    mouseup (evt) {
      if (!this.disabled) {
        this.value = !this.value
      }
    },
    keydown (evt) {
      evt.preventDefault()
    },
    keyup (evt) {
      if (!this.disabled && evt.code === 'Space') this.value = !this.value
      evt.preventDefault()
    }
  },
  methods: {
    connectedCallback () {
      this.tabIndex = 0
    },
    render () {
      this.style.display = this.hidden ? 'none' : 'inline-block'
      const thumb = this.shadowRoot.querySelector('.thumb')
      thumb.style.transition = this.transition
      thumb.style.background = this.thumbColor
      thumb.style.width = this.thumbSize
      thumb.style.height = this.thumbSize
      this.style.filter = this.disabled ? 'grayscale(1) opacity(0.8)' : ''
      const height = parseFloat(this.height)
      const thumbSize = parseFloat(this.thumbSize)
      const inset = (height - thumbSize) * 0.5
      thumb.style.top = `${inset}px`
      this.style.margin = `${-inset}px`
      this.style.background = this.value ? this.onColor : this.color
      this.style.width = this.width
      this.style.height = this.height
      this.style.transition = this.transition
      requestAnimationFrame(() => {
        thumb.style.left = this.value ? `${this.offsetWidth - inset - thumbSize}px` : `${inset}px`
      })
    }
  }
})

export {
  CheckboxSwitch
}
