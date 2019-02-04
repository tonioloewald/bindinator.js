/**
# Drag and Drop

HTML5-based drag and drop — a very lightweight library building on top of HTML5 drag
and drop behavior.

**Note**: right now this module runs once and doesn't return anything.

This module sets up some global event handlers and *just works*&trade; (arguably, it merely does things
that the browser should do, such as add a CSS selector for drop zones that are compatible
with what's being dragged).

Eventually, there will be utility methods for things like creating virtual drop targets
e.g. in between other elements to allow drag and drop rearrangment.

This module uses but *does not define* the following class selectors:

- `.drag-source` an element being dragged
- `.drag-target` an element on which the dragged object may be dropped
- `.drag-over` a `.drag-target` which the object is being dragged over

You may also wish to create style rules for:

- `[draggable="true"]` anything other than a `<a>` (and perhaps an `<img>`) that can be dragged
- `[data-drag]` indicates *types* of draggable things (but they won't be draggable without above
- `[data-drop]` indicates potential *drop zones*.

## Draggable Objects

To create a draggable element, add `draggable="true"`.

    <div draggable="true">Drag Me</div>

To specify the type(s) of content that will be dragged, use the `data-drag` attribute:

    <div draggable="true" data-drag="text/plain">Drag Me</div>

To specify the content dragged, use a `data-drag-content` attribute.

    <div
      draggable="true"
      data-drag="text/plain"
      data-drag-content="Surprise!"
    >Drag Me</div>

## Drop Zones

To create a drop zone, use the data-drop attribute set to a semicolon-delimited list
of mime types:

    <div data-drop="text/plain">
      Drop plain text here
    </div>
    <div data-drop="text/plain;text/html">
      Drop html or plain text here
    </div>

Finally, you can override default drop behavior (which is to copy the dragged node into
the drop zone node) simply using data-event="drop:path.to.drop_handler" as usual.

    <div
      data-drop="custom"
      data-event="drop:path.to.drop_handler"
    >
      Drop some custom thing here
    </div>

### Typed Drop Zones Example
```
<style>
.drag-source {
  box-shadow: 0 0 2px 2px orange;
  opacity: 0.5;
}
.drag-target {
  box-shadow: 0 0 1px 1px blue;
}
.drag-target.drag-over {
  background: rgba(0,0,255,0.25);
}
:not([data-drop]) > .drag,
[draggable="true"] {
  border: 1px solid rgba(255,192,0,0.5);
  cursor: pointer;
  display: block;
}

:not([data-drop]) > .drag,
.drag-target,
[data-drop],
[draggable="true"] {
  background: rgba(255,255,255,0.75);
  padding: 4px;
  margin: 4px;
  border-radius: 5px;
}
</style>
<h4>Draggable</h4>
<a class="drag" href="javascript: alert('I don't do anything)">Links are draggable by default</a>
<p draggable="true">
  Just adding the <code>draggable="true"</code>
  makes this paragraph draggable (as text/html by default)
</p>
<p draggable="true" data-drag="text/html">
  Draggable as <i>text/html</i>
</p>
<p draggable="true" data-drag="text/plain" data-drag-content="Surprise!">
  Draggable as <i>text/plain</i>, with <b>custom content</b>
</p>
<p draggable="true" data-drag="text/html;text/plain">
  Draggable as <i>text/html</i> or <i>text/plain</i>
</p>
<p draggable="true" data-drag="text/plain">
  Draggable as <i>text/plain</i>
</p>
<h4>Drop Targets</h4>
<div data-drop="text/html">
  You can drop stuff here
</div>
<div data-drop="text/html">
  You can drop HTML here
</div>
<div data-drop="text/*">
  You can drop any text
</div>
<div data-drop="text/html;url">
  You can drop HTML or urls here
</div>
<div
  data-drop="special/any"
  data-event="drop:_component_.drop"
>
  I accept anything and have special drop handling
</div>
<script>
  await import('../lib/drag-and-drop.js');
  set({
    drop: evt => {
      evt.target.textContent = 'received types: ' + b8r.makeArray(evt.dataTransfer.types).join(', ');
    }
  })
</script>
```

### Reorderable List Example

```
<style>
  [data-drop="reorderable/spectrum"] {
    height: 12px;
    z-index: 10;
    margin: -4px 4px;
  }
</style>
<div style="padding: 4px 0">
  <div
    data-list="_component_.items:id"
    class="drag-reorder-target"
  >
    <div
      data-drop="reorderable/spectrum"
      data-event="drop:_component_.reorder"
    ></div>
    <div
      style="color: white;text-shadow: 1px 1px 0 black;text-align:center"
      draggable="true"
      data-drag="reorderable/spectrum"
      data-bind="text,style(background)=.name"
    ></div>
  </div>
  <div
    data-drop="reorderable/spectrum"
    data-event="drop:_component_.reorder"
    class="drag-reorder-target"
  ></div>
</div>
<script>
  const {dnd: {draggedElement}} = await import('../lib/drag-and-drop.js');

  const shuffle = (deck) => {
    var shuffled = [];
    for( const card of deck ){
      shuffled.splice( Math.floor( Math.random() * (1 + shuffled.length) ), 0, card );
    }
    return shuffled;
  }

  set({
    items: shuffle([
      {id: 1, name: 'red'},
      {id: 2, name: 'orange'},
      {id: 3, name: 'yellow'},
      {id: 4, name: 'green'},
      {id: 5, name: 'blue'},
      {id: 6, name: 'indigo'},
      {id: 7, name: 'violet'},
    ]),
    reorder: (evt) => {
      const dropped = evt.target.closest('.drag-reorder-target');
      const dragged = draggedElement().closest('.drag-reorder-target');
      dropped.parentElement.insertBefore(dragged, dropped);
    },
  })
</script>
```
*/

import b8r from '../source/b8r.js'

/*
const array_intersection = (A, B) => A.filter(a => B.indexOf(a) > -1);
*/

let isDragInProgress = false

const isTypeAllowed = (allowedTypes, type) => {
  let isAllowed = false
  b8r.forEach(allowedTypes, allowedType => {
    if (allowedType === 'special/any') {
      isAllowed = true
      return false
    } else if (allowedType.indexOf('*') > -1) {
      const [A, B] = allowedType.split('/')
      const [a, b] = type.split('/')
      if ((A === '*' || A === a) && (B === '*' || B === b)) {
        isAllowed = true
        return false
      }
    } else {
      if (allowedType === type) {
        isAllowed = true
        return false
      }
    }
  })
  return isAllowed
}

const end = () => {
  isDragInProgress = false
  b8r.find('.drag-source').forEach(elt => elt.classList.remove('drag-source'))
  b8r.find('.drag-target').forEach(elt => elt.classList.remove('drag-target'))
}

const markDroppable = types => {
  end()
  isDragInProgress = true
  const elements = b8r.find('[data-drop]')
  elements.forEach(element => {
    const dropTypes = element.dataset.drop.split(';')
    if (types.find(type => isTypeAllowed(dropTypes, type))) {
      element.classList.add('drag-target')
    } else {
      element.classList.remove('drag-target')
    }
  })
}

const trim = s => s.trim()

let draggedElement

export const dnd = {
  start (evt) {
    const target = evt.target.closest('[draggable="true"],a[href]')
    if (!target) {
      return
    }
    target.classList.add('drag-source')
    draggedElement = target
    const types = target.matches('[draggable="true"]')
      ? (target.dataset.drag || 'text/html').split(';').map(trim)
      : (target.dataset.drag || 'url').split(';').map(trim)
    types.forEach(type => {
      const content = target.dataset.dragContent ||
                      (type === 'text/html' ? target.innerHTML : target.textContent)
      evt.dataTransfer.setData(type, content)
    })
    markDroppable(evt.dataTransfer.types)
    return true
  },
  drag (evt) {
    if (!isDragInProgress) {
      markDroppable(evt.dataTransfer.types)
    }
    const target = evt.target.closest('.drag-target')
    if (target) {
      target.classList.add('drag-over')
      evt.dataTransfer.dropEffect = 'copy'
    } else {
      evt.preventDefault()
      return true
    }
  },
  leave () {
    const target = b8r.findOne('.drag-over')
    if (target) {
      target.classList.remove('drag-over')
    }
  },
  drop (evt) {
    const target = evt.target.closest('.drag-target')
    end()
    if (target) {
      const dropTypes = target.dataset.drop.split(';')
      b8r.forEach(dropTypes, type => {
        if (isTypeAllowed(b8r.makeArray(evt.dataTransfer.types), type)) {
          if (type === 'text/html') {
            target.innerHTML = evt.dataTransfer.getData(type)
          } else {
            target.textContent = evt.dataTransfer.getData(type)
          }
          return false
        }
      })
    } else {
      evt.preventDefault()
      return true
    }
  },
  end,
  draggedElement: () => draggedElement
}

b8r.register('drag-and-drop', dnd)
b8r.on(document.body, 'dragstart', 'drag-and-drop.start')
b8r.on(document.body, 'dragenter,dragover', 'drag-and-drop.drag')
b8r.on(document.body, 'drop', 'drag-and-drop.drop')
b8r.on(document.body, 'dragleave', 'drag-and-drop.leave')
b8r.on(document.body, 'dragend', 'drag-and-drop.end')

// stop dragged items from reloading the window
window.addEventListener('dragover', evt => evt.preventDefault())
window.addEventListener('drop', evt => evt.preventDefault())

export default dnd
