/**
# animatedScroll

    animatedScroll(scrolling_element, desired_scrolltop, desired_scrollleft=0);

Perform a snappy animated scroll on the specified element to the specified position.

    animatedScroll.visible(elt);

`animatedScroll.visible(elt)` will return `true` if `elt` is wholly visible (i.e. not clipped
by its direct parentElement).

    animatedScroll.intoView(elt);

`animatedScroll.intoView(elt)` will check if the element is visible and not it will scroll
it into view using animatedScroll.

```
<style>
  ._component_ {
    padding: 5px;
  }
  ._component_-scroller {
    position: relative;
    overflow: scroll;
    overflow: overlay;
    background: #ddd;
    width: 400px;
    height: 400px;
  }

  ._component_-scroller > div {
    position: absolute;
    width: 100px;
    height: 100px;
    opacity: 0.5;
  }

  ._component_-panel {
    margin-top: 5px;
  }
</style>
<div class="_component_-scroller">
  <div style="top: 75px; left: 50px; width: 400px; height: 400px; background: purple;">
  </div>
  <div style="top: 10px; left: 20px; background: yellow;">
  </div>
  <div style="top: 350px; left: 390px; background: red;">
  </div>
  <div style="top: 390px; left: 100px; background: green;">
  </div>
  <div style="top: 25px; left: 350px; background: blue;">
  </div>
</div>
<div class="_component_-panel" data-event="click:_component_.show">
  <button>Show Red</button>
  <button>Show Yellow</button>
  <button>Show Green</button>
  <button>Show Blue</button>
  <button>Show Purple</button>
</div>
<script>
  const {intoView} = await import('../lib/animated-scroll.js');
  const show = evt => {
    const color = evt.target.textContent.trim().split(' ').pop().toLocaleLowerCase();
    const target = findOne(`[style*="${color}"]`);
    intoView(target);
  }
  set({show});
</script>
```
*/
/* global requestAnimationFrame, cancelAnimationFrame */

'use strict'

const scrollers = [] // {elt, top, left}
let _frame = null

const _scroll = () => {
  for (let i = scrollers.length - 1; i >= 0; i--) {
    const scroller = scrollers[i]
    if (
      Math.max(
        Math.abs(scroller.elt.scrollTop - scroller.top),
        Math.abs(scroller.elt.scrollLeft - scroller.left)
      ) > 1
    ) {
      scroller.elt.scrollTop = scroller.elt.scrollTop * 0.5 + scroller.top * 0.5
      scroller.elt.scrollLeft = scroller.elt.scrollLeft * 0.5 + scroller.left * 0.5
    } else {
      scroller.elt.scrollTop = scroller.top
      scroller.elt.scrollLeft = scroller.left
      scrollers.splice(i, 1)
    }
  }

  if (scrollers.length) {
    _frame = requestAnimationFrame(_scroll)
  }
}

export const animatedScroll = (elt, top, left = 0) => {
  let scroller = scrollers.find(item => item.elt === elt)
  if (scroller) {
    scroller.top = top
    scroller.left = left
  } else {
    scroller = { elt, top, left }
    scrollers.push(scroller)
  }
  cancelAnimationFrame(_frame)
  _frame = requestAnimationFrame(_scroll)
}

export const visible = elt => {
  const R = elt.parentElement.getBoundingClientRect()
  const r = elt.getBoundingClientRect()
  return r.x >= R.x &&
         r.y >= R.y &&
         (r.x + r.width) <= (R.x + R.width) &&
         (r.y + r.height) <= (R.y + R.height)
}

export const intoView = elt => {
  if (visible(elt)) return

  const parent = elt.parentElement
  const maxTop = elt.offsetTop + elt.offsetHeight - parent.clientHeight
  const top = parent.scrollTop > elt.offsetTop
    ? elt.offsetTop
    : parent.scrollTop < maxTop
      ? maxTop
      : parent.scrollTop
  const maxLeft = elt.offsetLeft + elt.offsetWidth - parent.clientWidth
  const left = parent.scrollLeft > elt.offsetLeft
    ? elt.offsetLeft
    : parent.scrollLeft < maxLeft
      ? maxLeft
      : parent.scrollLeft

  animatedScroll(parent, top, left)
}
