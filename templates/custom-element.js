/**
# custom-element template

Justify this thing's existence

<b8r-component name="fiddle">
import('../templates/custom-element.js')
example.appendChild(document.createElement('make-this-yours'))
</b8r-component>
*/
import { makeWebComponent, div, slot /* makeElement, span, etc. */ } from '../source/web-components.js'

export default makeWebComponent('make-this-yours', {
  /*
  superClass=HTMLElement, // the class you're extending
  */
  style: /* false for no shadow DOM or */ {
    ':host div': {
      content: ' ',
      display: 'inline-block',
      minWidth: '20px',
      minHeight: '20px'
    }
  },
  props: {
    // example of a computed property
    checked (newValue) {
      if (newValue !== undefined) {
        this.value = !!newValue
      } else {
        return this.value
      }
    },
    enabled () {
      // example of a read-only computed property
      return !this.disabled
    }
  }, // map names to default values / functions
  methods: {
    // connectedCallback () {}, // when inserted into the DOM
    connectedCallback () {
      console.log('I am here!')
    },
    render () {
      this.style.pointerEvents = this.disabled ? 'none' : ''
      this.style.opacity = this.disabled ? '0.5' : ''
      this.style.backgroundColor = this.value === null ? 'pink' : this.value ? 'red' : 'white'
    }
    // close () {},             // on destroy
  }, // map names to class methods
  eventHandlers: {
    mouseup () {
      this.value = !this.value
    }
  }, // map eventTypes to event handlers
  attributes: {
    disabled: false,
    value: false
  }, // map attributes to default values
  content: div({
    content: slot()
  }), // HTMLElement or DocumentFragment or falsy
  role: 'blink' // expect string
})
