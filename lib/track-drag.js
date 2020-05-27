/**
# track-drag

A library for implementing user-moveable elements without the usual headaches.

- handles both mouse and touch events
- uses a singleton floating div to track the user's actinn until the drag ends
- passes back both processed coordinates and deltas
- handles grid snapping (hold down shift to enable grid-snapping)

The [sizer](?source=sizer.component.html) and [resizer](?source=resizer.component.html)
widgets that let you resize the "fiddle" and its panes are powered by this library.

### Usage

    import {listenForDragStart, trackDrag, moveEventDiv} from './path/to/track-drag.js'
    // moveEventDiv is a foreground element that intercepts pointer events during
    // set up listeners for mousedown and touch events to initiate dragging
    listenForDragStart(elt, (evt) => {
      // do whatever setup you want
      // pass your initial x, y values
      trackDrag(evt, x, y, (x, y, dx, dy, dragEnded) => {
        // x and y will be moved around by the user's drag operation
        // dx and dy will be deltas from last time
        // dragEnded will indicate if the drag operation has ended
      })
    })

### Example

```
<style>
  ._component_ .target {
    position: absolute;
    left: 50px;
    top: 20px;
    width: 30px;
    height: 30px;
    cursor: move;
    background: rgba(255, 0, 0, 0.5);
    cursor: grab;
  }
</style>
<h3 style="position: absolute; left: 10px; bottom: 10px">Drag the red square</h3>
<div class="target">
</div>
<script>
  const {listenForDragStart, trackDrag, moveEventDiv} = await import('../lib/track-drag.js')
  const div = findOne('div')
  listenForDragStart(div, (evt) => {
    const style = getComputedStyle(div)
    const left = parseFloat(style.left)
    const top = parseFloat(style.top)
    moveEventDiv.style.cursor = 'grabbing'
    trackDrag(evt, left, top, (x, y, dx, dy, dragEnded) => {
      if (x < 0) x = 0
      if (y < 0) y = 0
      div.style.left = x + 'px'
      div.style.top = y + 'px'
      if (dragEnded) moveEventDiv.style.cursor = ''
    })
  })
</script>
```
*/

let _moveState = null
const _moveEventDiv = document.createElement('div')
Object.assign(_moveEventDiv.style, {
  content: ' ',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999
})

let gridSize = 10

export const getGridSize = () => gridSize
export const setGridSize = (x) => { gridSize = x }

const snapped = (x) => Math.round(x / gridSize) * gridSize

const _move = (evt, dragEnded = false) => {
  const isMouseEvent = evt.type.startsWith('mouse')
  const {
    callback,
    pageX,
    pageY,
    lastX,
    lastY,
    origX,
    origY,
    touchIdentifier
  } = _moveState
  const touch = isMouseEvent ? null : [...evt.changedTouches].find(c => c.identifier === touchIdentifier)
  const positionSource = isMouseEvent ? evt : touch
  let x = positionSource.pageX - pageX + origX
  let y = positionSource.pageY - pageY + origY
  if (evt.shiftKey) {
    x = snapped(x)
    y = snapped(y)
  }
  const dx = x - lastX
  const dy = y - lastY
  _moveState.lastX += dx
  _moveState.lastY += dy
  callback(x, y, dx, dy, dragEnded)
  evt.stopPropagation()
}

_moveEventDiv.addEventListener('mousemove', _move)

_moveEventDiv.addEventListener('mouseup', (evt) => {
  _move(evt, true)
  _moveState = null
  _moveEventDiv.remove()
})

export const trackDrag = (initialEvent, origX, origY, callback) => {
  const isMouseEvent = initialEvent.type === 'mousedown'
  const {
    pageX,
    pageY
  } = isMouseEvent ? initialEvent : initialEvent.changedTouches[0]
  _moveState = {
    callback,
    pageX,
    pageY,
    origX,
    origY,
    lastX: origX,
    lastY: origY,
    touchIdentifier: isMouseEvent ? null : initialEvent.changedTouches[0].identifier
  }
  if (isMouseEvent) {
    document.body.append(_moveEventDiv)
  }
  initialEvent.stopPropagation()
}

const passive = {passive: true}

export const moveEventDiv = _moveEventDiv

export const listenForDragStart = (elt, callback) => {
  elt.addEventListener('mousedown', callback, passive)
  elt.addEventListener('touchstart', callback, passive)
  elt.addEventListener('touchmove', _move, passive)
  elt.addEventListener('touchend', (evt) => {
    _move(evt, true)
  }, passive)
}
