/**
# float

Provides a custom `<b8r-float>` element.

Supports some useful attributes:

- `drag=false` -- whether the element can be dragged around

Try creating multiple floats and verifying that you can bring each to
the front.

```
<style>
  b8r-float {
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
    z-index: 100;
    background: var(--content-bg-color);
  }

  .close-float {
    position: absolute;
    top: 5px;
    right: 5px;
    margin: 0;
  }
</style>
<button
  data-event="click:_component_.create"
>Create Floater</button>
<b8r-float
  drag="true"
>
  <h3>I'm floating</h3>
  <p>
    Look ma, a floating element!
  </p>
  <button class="close-float" data-event="
    click:_component_.close;
    mousedown:_b8r_.stopEvent;
  ">&times;</button>
</b8r-float>
<script>
  await import('../web-components/float.js');
  const floater = findOne('b8r-float').cloneNode(true);
  set({
    create(){
      component.appendChild(floater.cloneNode(true));
    },
    close(evt){
      evt.target.closest('b8r-float').remove();
    },
  })
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/float.js', 'b8r-float')
~~~~
*/
/* global getComputedStyle */

import { makeWebComponent, slot } from '../source/web-components.js'
import { listenForDragStart, trackDrag, moveEventDiv } from '../lib/track-drag.js'

const Float = makeWebComponent('b8r-float', {
  style: {
    ':host': {
      display: 'block',
      position: 'fixed',
      cursor: 'grab'
    }
  },
  attributes: {
    drag: false
  },
  content: slot(),
  eventHandlers: {
    mousedown (evt) {
      const target = evt.target.closest('b8r-float')

      // move clicked floater on top of all its siblings
      const topMost = [...document.querySelectorAll('b8r-float')]
        .map(elt => parseInt(getComputedStyle(elt).zIndex, 10))
        .reduce((zIndex, max) => zIndex > max ? zIndex : max, 0)
      target.style.zIndex = topMost + 1
    }
  },
  methods: {
    connectedCallback () {
      const float = this
      listenForDragStart(float, (evt) => {
        const rect = float.getBoundingClientRect()
        const left = rect.x
        const top = rect.y
        moveEventDiv.style.cursor = 'grabbing'
        trackDrag(evt, left, top, (x, y, dx, dy, dragEnd) => {
          if (x < 0) x = 0
          if (y < 0) y = 0
          float.style.left = x + 'px'
          float.style.top = y + 'px'
          if (dragEnd) moveEventDiv.style.cursor = ''
        })
      })
    },
    close () {
      this.remove()
    }
  }
})

export {
  Float
}
