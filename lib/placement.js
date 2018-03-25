/**
# placement

A library for placing DOM elements.

    float(element, {position=false, offset=false});

Float the element above everything else. This means sending it to the bottom of the DOM
(document.body.appendChild) and then using above() to set its z-index higher than any sibling.

`position` is a point `{x,y}` which will be a fixed position a rect
(`{left, top, width, height}`) or an element (whose bounding rect 
will be used). A point will be {x,y} converted to a rectangle 
thus: `{left: x, top: y, width: 0, height: 0}`. If no position
is provided, the element's own position will be preserved.

`offset` is either false (the element will be __centered__ on the position) or
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
  }

  ._component_-floater {
    text-align: center;
    display: inline-block;
    width: 150px;
    padding: 20px;
    background: #ffd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    animation: fade-in 0.25s ease-out;
  }
</style>
<p>
  Click on a cell to float the div relative to it.
</p>
<table data-event="click:_component_.place_div">
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
<div class="_component_-floater">
  Floater
</div>
<script>
  const {float} = require('./lib/placement.js');
  const floater = findOne('div');
  set({
    place_div: evt => {
      float(floater, {position: evt.target, offset: evt.target.textContent});
    },
  })
</script>
```

    drag(element, {bounds=null}); 

Allow the user to drag the element around. 
Bounds can be a rect `{left, top, width, height}`.

    above(element);

Set the element's z-index to be greater than all siblings.

```
<div data-event="click:_component_.bring_to_front" style="padding: 20px">
  <div style="position:relative; background:red; z-index:5; width:100px; height: 50px; margin: -10px 0;">&nbsp;</div>
  <div style="position:relative; background:green; width:100px; height:50px; margin: -10px 0 -10px 10px;">&nbsp;</div>
  <div style="position:relative; background:blue; width:100px; height:50px; margin: -10px 0 -10px 20px;">&nbsp;</div>
</div>
<p>Clicking any rect brings it to the front</p>
<script>
  const {above} = require('./lib/placement.js');
  set({
    bring_to_front: evt => above(evt.target),
  });
</script>
```

*/
/* global module, console */
'use strict';

const above = (element, min_z=1) => {
  const z = Math.max(
    min_z,
    [].slice.apply(element.parentElement.children).
    filter(e => e !== element).
    map(e => parseInt('0' + getComputedStyle(e).zIndex, 10)).
    concat(0).
    sort().
    pop() + 1
  );
  element.style.zIndex = z;
};

const float = (element, {position=false, offset=false}) => {
  if (!position) {
    position = element.getBoundingClientRect();
  } else if (position.x) {
    position = {left: position.x, top: position.y, width: 0, height: 0};
  } else if (position instanceof HTMLElement) {
    position = position.getBoundingClientRect();
  } else {
    console.error('float() failed -- position not an expected value');
  }
  element.style.position = 'fixed';
  document.body.appendChild(element);
  const element_rect = element.getBoundingClientRect();

  let left, top;
  if (offset[0] === 'n') {
    top = position.top - element_rect.height;
  } else if (offset[0] === 's') {
    top = position.top + position.height;
  } else {
    top = position.top + (position.height- element_rect.height) * 0.5;
  }
  if (offset.substr(-1) === 'w') {
    left = position.left - element_rect.width;
  } else if (offset.substr(-1) === 'e') {
    left = position.left + position.width;
  } else {
    left = position.left + (position.width - element_rect.width) * 0.5;
  }
  element.style.left = left + 'px';
  element.style.top = top + 'px';
  above(element, 100);
};

const drag = (element, {bounds=null}) => {

};

module.exports = {float, drag, above};