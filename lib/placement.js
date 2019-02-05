/**
# placement

A library for placing DOM elements.

    float(element, {position=false, offset='c'});

"Floats" the element above everything else. This means sending it to the bottom of the DOM
(document.body.appendChild) and then using above() to set its z-index higher than any sibling
and setting it to `position: fixed` and positioning it as specified.

A floated element will have the class `placement-floating` added to it.

`position` is a point `{x,y}` which will be a fixed position a rect
(`{left, top, width, height}`) or an element (whose bounding rect
will be used). A point will be {x,y} converted to a rectangle
thus: `{left: x, top: y, width: 0, height: 0}`. If no position
is provided, the element's own position will be preserved.

`offset` is either 'c' (the element will be __centered__ on the position) or
a compass direction `'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw'`.

```
<style>
  ._component_ table {
    border-collapse: collapse;
  }

  ._component_ td {
    text-align: center;
    padding: 10px;
    width: 60px;
    border: 1px solid rgba(0,0,0,0.25);
    cursor: default;
  }

  ._component_ td:hover {
    background: rgba(0,0,0,0.1);
  }

  ._component_-floater {
    text-align: center;
    display: inline-block;
    width: 150px;
    padding: 35px 0 20px;
    background: #ffd;
    border-radius: 4px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
    animation: fade-in 0.25s ease-out;
    position: relative;
  }

  ._component_-floater.placement-n {
    transform: translateY(-8px);
  }

  ._component_-floater.placement-n:after {
    content: ' ';
    display: block;
    position: absolute;
    bottom: -14px;
    left: 50%;
    width: 0;
    height: 0;
    margin-left: -7px;
    border: 7px solid transparent;
    border-top-color: #ffd;
  }

  ._component_-floater.placement-ne {
    transform: translateX(-32px) translateY(-8px);
  }

  ._component_-floater.placement-ne:after {
    content: ' ';
    display: block;
    position: absolute;
    bottom: -14px;
    left: 9px;
    width: 0;
    height: 0;
    border: 7px solid transparent;
    border-top-color: #ffd;
  }

  ._component_-drag {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 15px;
    line-height: 15px;
    background: rgba(0,0,0,0.1);
    cursor: move;
    text-align: center;
    font-size: 10px;
  }
</style>
<p>
  Click on a cell to float the div relative to it.
</p>
<div class="_component_-floater">
  <div
    class="_component_-drag"
    data-event="mousedown:placement-controller.move"
  >Drag Me!</div>
  Floater
</div>
<table data-event="click:_component_.placeDiv">
  <tr>
    <td>nw</td><td>n</td><td>ne</td>
  </tr>
  <tr>
    <td>w</td><td>c</td><td>e</td>
  </tr>
  <tr>
    <td>sw</td><td>s</td><td>se</td>
  </tr>
</table>
<script>
  const {float} = await import('../lib/placement.js');
  const floater = findOne('div');
  float(floater, {offset:'w'});
  set({
    placeDiv: evt => {
      float(floater, {position: evt.target, offset: evt.target.textContent});
    },
    destroy: () => floater.remove(),
  })
</script>
```

To make any floating element draggable with the mouse, simply add an
event handler of the form `data-event="mousedown:placement-controller.move"`
(loading placement.js registers `placement-controller`).

    above(element);

Set the element's `z-index` to be greater than all competing elements (i.e. non-static
siblings and nearest non-static descendants of static siblines. Note that
an element cannot get in front of elements descended from a parent that is in front
of an ancestor of the element, so to truly ensure an element is in front of everything
you must `document.body.appendChild()` and then `above()` it.

```
<div data-event="click:_component_.bringToFront" style="padding: 20px">
  <div style="position:relative; background:red; z-index:5; width:100px; height: 50px; margin: -10px 0;">&nbsp;</div>
  <div style="position:relative; background:green; width:100px; height:50px; margin: -10px 0 -10px 10px;">&nbsp;</div>
  <div style="position:relative; background:blue; width:100px; height:50px; margin: -10px 0 -10px 20px;">&nbsp;</div>
</div>
<p>Clicking any rect brings it to the front</p>
<script>
  const {above} = await import('../lib/placement.js');
  set({
    bringToFront: evt => above(evt.target),
  });
</script>
```

*/
/* global console, getComputedStyle, HTMLElement */

import { register, set, get, remove } from '../source/b8r.registry.js'
import { on } from '../source/b8r.events.js'
import { onAny, offAny } from '../source/b8r.anyEvent.js'

const getZIndex = elt => {
  const style = getComputedStyle(elt)
  if (style.position === 'static' && elt.children.length) {
    return [].slice.apply(elt.children).map(getZIndex).sort().pop()
  } else {
    return parseInt('0' + style.zIndex, 10)
  }
}

const above = (element) => {
  const siblings = [].slice.apply(element.parentElement.children)
    .filter(e => e !== element)
  const z = siblings.length
    ? siblings.map(getZIndex).sort().pop() + 1
    : 1
  element.style.zIndex = z
}

const removePlacement = element => {
  [].slice.apply(element.classList).forEach(c => {
    if (c.startsWith('placement-')) element.classList.remove(c)
  })
}

const removeOffset = element => {
  [].slice.apply(element.classList).forEach(c => {
    if (c.match(/placement-[nsew]{1,2}/)) element.classList.remove(c)
  })
}

const float = (element, { position = false, offset = 'c' }) => {
  if (!position) {
    position = element.getBoundingClientRect()
  } else if (position.x) {
    position = { left: position.x, top: position.y, width: 0, height: 0 }
  } else if (position instanceof HTMLElement) {
    position = position.getBoundingClientRect()
  } else {
    console.error('float() failed -- position not an expected value')
  }
  removeOffset(element)
  element.classList.add('placement-floating')
  element.classList.add('placement-' + offset)
  on(element, 'mousedown', 'placement-controller.bringToFront')
  element.style.position = 'fixed'
  document.body.appendChild(element)
  const elementRect = element.getBoundingClientRect()

  let left, top
  if (offset[0] === 'n') {
    top = position.top - elementRect.height
  } else if (offset[0] === 's') {
    top = position.top + position.height
  } else {
    top = position.top + (position.height - elementRect.height) * 0.5
  }
  if (offset.substr(-1) === 'w') {
    left = position.left - elementRect.width
  } else if (offset.substr(-1) === 'e') {
    left = position.left + position.width
  } else {
    left = position.left + (position.width - elementRect.width) * 0.5
  }
  element.style.left = left + 'px'
  element.style.top = top + 'px'
  above(element)
}

register('placement-controller', {
  bringToFront: evt => {
    const floater = evt.target.closest('.placement-floating')
    above(floater)
  },
  move: evt => {
    const floater = evt.target.closest('.placement-floating')
    removeOffset(floater)
    above(floater)
    const style = getComputedStyle(floater)
    set('placement-controller.origin', {
      floater,
      left: parseInt(style.left, 10),
      top: parseInt(style.top, 10),
      x: evt.clientX,
      y: evt.clientY
    })
    onAny('mousemove', 'placement-controller.moving')
    onAny('mouseup', 'placement-controller.moving')
  },
  moving: evt => {
    const { floater, left, top, x, y } = get('placement-controller.origin')
    floater.style.left = (left + evt.clientX - x) + 'px'
    floater.style.top = (top + evt.clientY - y) + 'px'
    if (evt.type === 'mouseup') {
      remove('placement-controller.origin')
      offAny('mousemove', 'placement-controller.moving')
      offAny('mouseup', 'placement-controller.moving')
    }
  }
})

export { float, above, removePlacement }
