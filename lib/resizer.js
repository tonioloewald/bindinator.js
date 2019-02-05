/**
# resizer

Make an element resize their container
*/
/* global getComputedStyle */

import b8r from '../source/b8r.js'
const int = x => parseInt(x, 10)

const resizeOrigin = {}
const mousedown = evt => {
  const target = evt.target.closest('.resizer-target') || evt.target.parentElement
  resizeOrigin.w = target.offsetWidth
  resizeOrigin.h = target.offsetHeight
  resizeOrigin.x = evt.clientX
  resizeOrigin.y = evt.clientY
  resizeOrigin.target = target
  const style = getComputedStyle(target)
  resizeOrigin.minWidth = int(style.minWidth)
  resizeOrigin.minHeight = int(style.minHeight)
  b8r.onAny('mousemove', 'resizer.mousemove')
  b8r.onAny('mouseup', 'resizer.mouseup')
}

const mousemove = evt => {
  const target = resizeOrigin.target
  const dx = evt.clientX - resizeOrigin.x
  const dy = evt.clientY - resizeOrigin.y
  target.style.width = Math.max(dx + resizeOrigin.w, resizeOrigin.minWidth) + 'px'
  target.style.height = Math.max(dy + resizeOrigin.h, resizeOrigin.minHeight) + 'px'
  b8r.trigger('resize', target.querySelector('.resizer-target') || target)
}

const mouseup = evt => {
  mousemove(evt)
  b8r.offAny('mousemove', 'resizer.mousemove')
  b8r.offAny('mouseup', 'resizer.mouseup')
}

b8r.register('resizer', { mousedown, mousemove, mouseup })

export { mousedown, mousemove, mouseup }
