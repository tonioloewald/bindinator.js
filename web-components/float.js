/**
# float

Provides a custom `<float-div>` element.

Supports some useful attributes:

- `drag=false` -- whether the element can be dragged around
- `x=50%` -- position in pixels or percentage (0 is 0 either way)
- `y=50%` -- position in pixels or percentage
- `pin="NW"` -- where to pin the element's position (e.g. "NW", "E", "" == center)

```
<style>
  float-div {
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
    z-index: 100;
    background: white;
  }

  .close-float {
    position: absolute;
    top: 5px;
    right: 5px;
  }
</style>
<float-div drag="true">
  <h3>I'm floating</h3>
  <p>
    Look ma, a floating element!
  </p>
  <button class="close-float" data-event="
    click:_component_.close;
    mousedown:_b8r_.stopEvent;
  ">&times;</button>
</float-div>
<script>
  require('web-components/float.js');
  set({
    close(){
      findOne('float-div').remove();
    },
  })
</script>
```
*/
const {
  makeWebComponent,
  div,
  fragment,
  slot,
} = require('../lib/web-components.js');


const mousemove = (evt) => {
  const target = evt.target._target;
  const {clientX, clientY} = evt;
  target.style.left = (clientX - target._dragging.x) + 'px';
  target.style.top = (clientY - target._dragging.y) + 'px';
  evt.preventDefault();
  evt.stopPropagation();
};

const mouseup = (evt) => {
  evt.target.style.display = 'none';
  const target = evt.target._target;
  delete(target._dragging);
  evt.preventDefault();
  evt.stopPropagation();
};

const MarkdownArea = makeWebComponent('float-div', {
  style: {
    ':host': {
      display: 'block',
      position: 'fixed',
      top: 0,
      left: 0,
    },
    '.drag-region': {
      display: 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }
  },
  attributes: {
    x: "50%",
    y: "50%",
    pin: 'center',
    drag: false,
  },
  content: fragment(
    slot(),
    div({classes: ['drag-region']}),
  ),
  eventHandlers: {
    mousedown (evt) {
      const target = evt.target.closest('float-div');
      if (target.drag) {
        this.shadowRoot.querySelector('.drag-region').style.display = 'block';
        const {clientX, clientY} = evt;
        target._dragging = {
          x: clientX - parseFloat(target.style.left),
          y: clientY - parseFloat(target.style.top),
        };
        evt.preventDefault();
        evt.stopPropagation();
      }
    },
  },
  methods: {
    render() {
      const dragRegion = this.shadowRoot.querySelector('.drag-region');
      if (!dragRegion._target) {
        dragRegion._target = this;
        dragRegion.addEventListener('mousemove', mousemove);
        dragRegion.addEventListener('mouseup', mouseup);
      }
      const x = this.pin.toLowerCase().includes('n') ? 0 :
                this.pin.toLowerCase().includes('s') ? -1 : 0.5;
      const y = this.pin.toLowerCase().includes('w') ? 0 :
                this.pin.toLowerCase().includes('e') ? -1 : 0.5;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const left = this.x.endsWith('%') ? w * parseFloat(this.x) * 0.01 : parseFloat(this.x);
      const top = this.y.endsWith('%') ? h * parseFloat(this.y) * 0.01 : parseFloat(this.y);
      this.style.left = (left + x * this.offsetWidth) + 'px';
      this.style.top = (top + y * this.offsetHeight) + 'px';
    },
    close () {
      this.remove();
    },
  },
});
