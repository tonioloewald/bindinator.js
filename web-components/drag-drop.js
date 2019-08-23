/**
# drag and drop

This library provides three custom elements:
- `<b8r-draggable>` — a draggable object
- `<b8r-dropzone>` — a b8r-dropzone
- `<b8r-drag-sortable>` — a container for <b8r-draggables> that supports
  reordering and insertion via drag-and-drop

This is HTML5 drag-and-drop, so it transparently supports built-in browser and OS
support for drag-and-drop, allowing things like files to be dragged into a DOM
element or DOM elements to be dragged to other applications and so forth. (Or at
least it should...)

These elements support a `type` attribute, which is a semicolon-delimited set of "mime-types".

The `<b8r-draggable>` element supports a `content` attribute which replaces the default content
of the element when dropped.

The `<b8r-dropzone>` element supports an `effect` attribute, which can be 'copy' (the default) or 'move'.
It also has a `handleDrop(evt)` method which gets first look at any drop events. You
can override it to do custom handling and `return true` to block default handling.

The `<b8r-drag-sortable>` element supports an `outsideEffect` attribute, which is 'copy'
by default. This determines what it does if it receives a dragged element from outside.
To handle data dragged from outside your app, you'll need to override the element's
`handleDrop` method.

And a two methods:
- `dragEnd()` — cleans up drag operation
- `dragged()` — returns the `<b8r-draggable>` being dragged or `true` for something dragged from outside

### Simple Examples

Note that one of the `<b8r-dropzone>`s only accepts `text/html`. Also note that
you can drag any of the `<b8r-draggable>`s into the `<b8r-drag-sortable>` container
in the second example.

```
<style>
  ._component_ a[href],
  b8r-draggable,
  b8r-dropzone {
    display: block;
    padding: 10px 20px;
    margin: 5px;
    border-radius: 5px;
    transition: 0.25s ease-out;
    border: 0;
    box-shadow: inset 0 0 0 2px rgba(0,0,255,0.1);
  }
  ._component_ a[href],
  b8r-draggable {
    box-shadow: inset 0 0 0 2px rgba(255,255,0,0.25);
    cursor: grab;
    background: #ddd;
  }
  .drag-source {
    box-shadow: inset 0 0 0 2px rgba(255,255,0,0.5);
    opacity: 0.5;
  }
  .drag-target {
    background: rgba(0,0,255,0.1);
    box-shadow: inset 0 0 0 2px rgba(0,0,255,0.5);
  }
  .drag-over {
    background: rgba(0,0,255,0.25);
  }
  .file-dropzone > img {
    max-width: 64px;
    max-height: 64px;
    display: block;
    margin: 5px 0;
  }
</style>
<a href="https://bindinator.com">urls are draggable by default</a>
<b8r-draggable>Drag Me <b>default</b></b8r-draggable>
<b8r-draggable type="text/html">Drag Me <b>HTML</b></b8r-draggable>
<b8r-draggable type="text/plain">Drag Me <b>Text</b></b8r-draggable>
<b8r-draggable content="the rain in spain stays mainly in the b8r-dropzone">
  Drag Me <b>Custom Content</b>
</b8r-draggable>
<b8r-draggable class="dynamic-content">
  Drag Me <b>Dynamic Content</b>
</b8r-draggable>
<b8r-dropzone>Copy to Me</b8r-dropzone>
<b8r-dropzone type="text/html" effect="move">Move HTML to Me</b8r-dropzone>
<b8r-dropzone class="custom-drop-handler" effect="move">Custom drop handler</b8r-dropzone>
<b8r-dropzone class="file-dropzone" type="Files">I accept PNG files</b8r-dropzone>
<script>
  await import('../web-components/drag-drop.js');
  const dynamicContent = findOne('.dynamic-content');
  dynamicContent.content = Math.random();
  const customDropZone = findOne('.custom-drop-handler');
  customDropZone.handleDrop = (evt) => {
    target = evt.target.closest('b8r-dropzone');
    const html = evt.dataTransfer.getData('text/html') ||
                 evt.dataTransfer.getData('text/plain');
    const types = [...evt.dataTransfer.items].map(item => item.type).join();
    target.innerHTML = `Custom drop handler received: <blockquote>${types}</blockquote>`;
    return true;
  };

  const fileDropZone = findOne('.file-dropzone');
  fileDropZone.handleDrop = (evt) => {
    console.log(evt.dataTransfer.files);
    const files = [];
    for(let i = 0; i < evt.dataTransfer.files.length; i++) {
      const file = evt.dataTransfer.files[i];
      if (file.type === 'image/png') {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        evt.target.appendChild(image)
      }
    }
    console.log(files);
    return true;
  };
</script>
```

### `<b8r-drag-sortable>` container

By default a `<b8r-drag-sortable>` container will copy items dragged from outside
but this example has been configured to move them instead.

The simplest way to make this work is to choose a very specific `type` for a
given sortable so that it will only accept items of that exact type. (You could
even use a uuid.)

For complex cases, you'll almost always want to override the container's default
`handleDrop` method and explicitly look at the event's dataTransfer property
(since this will allow you to drag data between apps, pages, etc).

```
<style>
  b8r-drag-sortable {
    padding-top: 5px;
  }
  b8r-drag-sortable > b8r-dropzone {
    margin: -5px 0 -20px;
    padding: 10px 0;
    box-shadow: none;
    position: relative;
    z-index: 1;
    visibility: hidden;
  }
  b8r-drag-sortable > .drag-target {
    visibility: visible;
    box-shadow: none;
  }
</style>
<b8r-drag-sortable outsideEffect="move">
  <b8r-draggable>Order</b8r-draggable>
  <b8r-draggable>Out</b8r-draggable>
  <b8r-draggable>of</b8r-draggable>
</b8r-drag-sortable>
<script>
  await import('../web-components/drag-drop.js');
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/drag-drop.js', 'b8r-draggable', 'b8r-dropzone', 'b8r-drag-sortable')
~~~~
*/
import { makeWebComponent } from '../source/web-components.js'

let elementBeingDragged = null
const dragged = () => elementBeingDragged

const isTypeAllowed = (allowedTypes, type) => {
  for (let i = 0; i < allowedTypes.length; i++) {
    const allowedType = allowedTypes[i]
    if (allowedType === 'special/any') {
      return true
    } else if (allowedType.indexOf('*') > -1) {
      const [A, B] = allowedType.split('/')
      const [a, b] = type.split('/')
      if ((A === '*' || A === a) && (B === '*' || B === b)) {
        return true
      }
    } else {
      if (allowedType === type) {
        return true
      }
    }
  };
  return false
}

const markDroppable = (evt) => {
  const { types } = evt.dataTransfer
  const elements = [...document.querySelectorAll('b8r-dropzone')]
  elements.forEach(element => {
    const dropTypes = element.type.split(';')
    if (types.find(type => isTypeAllowed(dropTypes, type))) {
      element.classList.add('drag-target')
    } else {
      element.classList.remove('drag-target')
    }
  })
}

const dragstart = (evt, draggable) => {
  if (draggable) {
    const types = draggable.type.split(';')
    types.forEach(type => {
      const content = draggable.content !== 'auto'
        ? draggable.content
        : (type === 'text/html' ? draggable.innerHTML : draggable.textContent)
      evt.dataTransfer.setData(type, content)
    })
    draggable.classList.add('drag-source')
    elementBeingDragged = draggable
  } else {
    if (!elementBeingDragged) elementBeingDragged = true
  }
  markDroppable(evt)
}

const DragItem = makeWebComponent('b8r-draggable', {
  attributes: {
    type: 'text/plain;text/html',
    content: 'auto'
  },
  content: false,
  eventHandlers: {
    dragstart (evt) {
      this.classList.add('drag-source')
      dragstart(evt, this)
    }
  },
  methods: {
    render () {
      this.setAttribute('draggable', true)
    }
  }
})

const drag = (evt) => {
  const target = evt.target.closest('b8r-dropzone.drag-target')
  if (target) {
    evt.preventDefault()
    evt.stopPropagation()
    target.classList.add('drag-over')
    evt.dataTransfer.dropEffect = target.effect
  }
}

const dragEnd = () => {
  elementBeingDragged = null;
  [...document.querySelectorAll('.drag-source')].forEach(elt => elt.classList.remove('drag-source'));
  [...document.querySelectorAll('.drag-over')].forEach(elt => elt.classList.remove('drag-over'));
  [...document.querySelectorAll('.drag-target')].forEach(elt => elt.classList.remove('drag-target'))
}

document.body.addEventListener('dragend', dragEnd)

// handle things dragged from outside the app's window
document.body.addEventListener('dragstart', dragstart)
document.body.addEventListener('dragenter', dragstart)

const DropZone = makeWebComponent('b8r-dropzone', {
  attributes: {
    type: 'text/plain;text/html',
    effect: 'copy'
  },
  content: false,
  methods: {
    handleDrop: evt => false // return explicit `true` to prevent defaults
  },
  eventHandlers: {
    dragenter: drag,
    dragover: drag,
    dragleave () {
      this.classList.remove('drag-over')
    },
    drop (evt) {
      evt.preventDefault()
      evt.stopPropagation()
      if (this.handleDrop(evt) === true) {
        dragEnd()
        return
      }
      const target = evt.target.closest('b8r-dropzone')
      const dropTypes = target.type.split(';')
      dropTypes.forEach(type => {
        if (isTypeAllowed(dropTypes, type)) {
          if (type === 'text/html') {
            target.innerHTML = evt.dataTransfer.getData(type)
          } else {
            target.textContent = evt.dataTransfer.getData(type)
          }
        }
      })
      dragEnd()
    }
  }
})

const DragSortable = makeWebComponent('b8r-drag-sortable', {
  style: {
    ':host': {
      display: 'block'
    }
  },
  attributes: {
    type: 'text/plain;text/html',
    outsideEffect: 'copy'
  },
  methods: {
    handleDrop (evt) {
      const target = evt.target.closest('b8r-dropzone')
      const container = this
      if (elementBeingDragged.parentElement === container) {
        container.insertBefore(elementBeingDragged, target)
      } else {
        if (container.outsideEffect === 'copy') {
          container.insertBefore(elementBeingDragged.cloneNode(true), target)
        } else {
          container.insertBefore(elementBeingDragged, target)
        }
      }
      container.render()
      return true
    },
    render () {
      const dz = new DropZone()
      const container = this
      const handleDrop = this.handleDrop.bind(this)
      dz.type = container.type
      dz.effect = 'move';
      [...this.querySelectorAll('b8r-dropzone')].forEach(elt => elt.remove());
      [...this.querySelectorAll('b8r-draggable')].forEach(elt => {
        const dzClone = dz.cloneNode(true)
        dzClone.handleDrop = handleDrop
        container.insertBefore(dzClone, elt)
      })
      const _dz = dz.cloneNode(true)
      _dz.handleDrop = handleDrop
      container.appendChild(_dz)
    }
  }
})

export {
  DragItem,
  DropZone,
  DragSortable,
  dragged,
  dragEnd
}
