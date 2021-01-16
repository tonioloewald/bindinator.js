/**
# event type b8r handles implicitly

These are the event types which b8r handles by default. (`b8r` inserts *one* event
handler for each of these event types at the `document.body` level and then routes
events from the original target.)

To add other types of events, you can call `b8r.implicitlyHandleEventsOfType('type')`

## Mouse Events

- `mousedown`, `mouseup`, `click`, `dblclick`, `contextmenu`
- `mouseleave`, `mouseenter`, `mousemove`, `mouseover`, `mouseout`
- `mousewheel`, `scroll`

## Drag Events

- `dragstart`, `dragenter`, `dragover`, `dragleave`, `dragend`, `drop`

## CSS Animations

- `transitionend`, `animationend`

## User Input

- `keydown`, `keyup`
- `input`, `change`
- `cut`, `copy`, `paste`
- `focus`, `blur`, `focusin`, `focusout`

*/

export default [
  'mousedown', 'mouseup', 'click', 'dblclick',
  'mouseleave', 'mouseenter', 'mousemove', 'mouseover', 'mouseout',
  'mousewheel', 'scroll', // FIXEME passive?!
  'contextmenu',
  'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
  'transitionend', 'animationend',
  'input', 'change',
  'keydown', 'keyup',
  'cut', 'copy', 'paste',
  'focus', 'blur', 'focusin', 'focusout', // more to follow
]
