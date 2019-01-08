/**
# drag and drop

This library provides three custom elements:
- `<drag-item>` — a draggable object
- `<drop-zone>` — a drop-zone
- `<drag-sortable>` — a container for <drag-items> that supports 
  reordering and insertion via drag-and-drop

This is HTML5 drag-and-drop, so it transparently supports built-in browser and OS
support for drag-and-drop, allowing things like files to be dragged into a DOM
element or DOM elements to be dragged to other applications and so forth. (Or at
least it should...)

These elements support a `type` attribute, which is a semicolon-delimited set of "mime-types".

The `<drag-item>` element supports a `content` attribute which replaces the default content
of the element when dropped.

The `<drop-zone>` element supports an `effect` attribute, which can be 'copy' (the default) or 'move'.
It also has a `handleDrop(evt)` method which gets first look at any drop events. You
can override it to do custom handling and `return true` to block default handling.

The `<drag-sortable>` element supports an `outsideEffect` attribute, which is 'copy'
by default. This determines what it does if it receives a dragged element from outside.
To handle data dragged from outside your app, you'll need to override the element's
`handleDrop` method.

And a two methods:
- `dragEnd()` — cleans up drag operation
- `dragged()` — returns the `<drag-item>` being dragged or `true` for something dragged from outside

### Simple Examples

Note that one of the `<drop-zone>`s only accepts `text/html`. Also note that
you can drag any of the `<drag-item>`s into the `<drag-sortable>` container
in the second example.

```
<style>
  drag-item,
  drop-zone {
    display: block;
    padding: 10px 20px;
    margin: 5px;
    border-radius: 5px;
    transition: 0.25s ease-out;
  }
  drag-item {
    box-shadow: inset 0 0 0 2px rgba(255,255,0,0.25);
    cursor: grab;
    background: #ddd;
  }
  .drag-source {
    box-shadow: inset 0 0 0 2px rgba(255,255,0,0.5);
    opacity: 0.5;
  }
  .drag-target {
    background: #def;
    box-shadow: inset 0 0 0 2px rgba(0,0,255,0.5);
  }
  .drag-over {
    background: rgba(0,0,255,0.25);
  }
</style>
<drag-item>Drag Me <b>default</b></drag-item>
<drag-item type="text/html">Drag Me <b>HTML</b></drag-item>
<drag-item type="text/plain">Drag Me <b>Text</b></drag-item>
<drag-item content="the rain in spain stays mainly in the drop-zone">
  Drag Me <b>Custom Content</b>
</drag-item>
<drop-zone>Copy to Me</drop-zone>
<drop-zone type="text/html" effect="move">Move HTML to Me</drop-zone>
<drop-zone class="custom-drop-handler" effect="move">Custom drop handler</drop-zone>
<script>
  const customDropZone = findOne('.custom-drop-handler');
  customDropZone.handleDrop = (evt) => {
    target = evt.target.closest('drop-zone');
    const html = evt.dataTransfer.getData('text/html') || 
                 evt.dataTransfer.getData('text/plain');
    target.innerHTML = `Custom drop handler: <blockquote>${html}</blockquote>`;
    return true;
  };
</script>
```

### `<drag-sortable>` container

By default a `<drag-sortable>` container will copy items dragged from outside
but this example has been configured to move them instead.

The simplest way to make this work is to choose a very specific `type` for a
given sortable so that it will only accept items of that exact type. (You could
even use a uuid.)

For complex cases, you'll almost always want to override the container's default 
`handleDrop` method and explicitly look at the event's dataTransfer property
(since this will allow you to drag data between apps, pages, etc).

```
<style>
  drag-sortable > drop-zone {
    margin: 0;
  }
</style>
<drag-sortable outsideEffect="move">
  <drag-item>Order</drag-item>
  <drag-item>Out</drag-item>
  <drag-item>of</drag-item>
</drag-sortable>
<script>
  require('web-components/drag-drop.js');
</script>
```
*/

'use strict';

const {
  makeWebComponent,
} = require('../lib/web-components.js');

let element_being_dragged = null;

const is_type_allowed = (allowed_types, type) => {
  let is_allowed = false;
  allowed_types.forEach(allowed_type => {
    if (allowed_type === 'special/any') {
      is_allowed = true;
      return false;
    } else if (allowed_type.indexOf('*') > -1) {
      const [A,B] = allowed_type.split('/');
      const [a,b] = type.split('/');
      if ((A === '*' || A === a) && (B === '*' || B === b)) {
        is_allowed = true;
        return false;
      }
    } else {
      if (allowed_type === type) {
        is_allowed = true;
        return false;
      }
    }
  });
  return is_allowed;
};

const mark_droppable = (types, draggable) => {
  element_being_dragged = draggable || true;
  if (draggable) draggable.classList.add('drag-source');
  const elements = [...document.querySelectorAll('drop-zone')];
  elements.forEach(element => {
    const drop_types = element.type.split(';');
    if (types.find(type => is_type_allowed(drop_types, type))) {
      element.classList.add('drag-target');
    } else {
      element.classList.remove('drag-target');
    }
  });
};

const dragstart = (evt) => {
  const types = evt.target.type.split(';');
  types.forEach(type => {
    const content = evt.target.content !== 'auto' ?
                    evt.target.content :
                    (type === 'text/html' ? evt.target.innerHTML : evt.target.textContent);
    evt.dataTransfer.setData(type, content);
  });
  mark_droppable(evt.dataTransfer.types, evt.target);
}

const DragItem = makeWebComponent('drag-item', {
  attributes: {
    type: 'text/plain;text/html',
    content: 'auto',
  },
  eventHandlers: {
    dragstart(evt) {
      this.classList.add('drag-source');
      dragstart(evt);
    },
  },
  methods: {
    render() {
      this.setAttribute('draggable', true);
    },
  },
});

const drag = (evt) => {
  if (!element_being_dragged && evt.dataTransfer) {
    element_being_dragged = true;
    mark_droppable(evt.dataTransfer.types);
  }
  const target = evt.target.closest('drop-zone.drag-target');
  if (target) {
    evt.preventDefault();
    evt.stopPropagation();
    target.classList.add('drag-over');
    evt.dataTransfer.dropEffect = target.effect; 
  }
};

const end = () => {
  element_being_dragged = null;
  [...document.querySelectorAll('.drag-source')].forEach(elt => elt.classList.remove('drag-source'));
  [...document.querySelectorAll('.drag-over')].forEach(elt => elt.classList.remove('drag-over'));
  [...document.querySelectorAll('.drag-target')].forEach(elt => elt.classList.remove('drag-target'));
};

document.body.addEventListener('dragend', end);
document.body.addEventListener('dragstart', dragstart);

const DropZone = makeWebComponent('drop-zone', {
  attributes: {
    type: 'text/plain;text/html',
    effect: 'copy',
  },
  methods: {
    handleDrop: evt => false, // return explicit `true` to prevent defaults
  },
  eventHandlers: {
    dragenter: drag,
    dragover: drag,
    dragleave () {
      this.classList.remove('drag-over');
    },
    drop (evt) {
      if (this.handleDrop(evt) === true) {
        end();
        return;
      }
      const drop_types = evt.target.type.split(';');
      drop_types.forEach(type => {
        if (is_type_allowed(drop_types, type)) {
          if (type === 'text/html') {
            evt.target.innerHTML = evt.dataTransfer.getData(type);
          } else {
            evt.target.textContent = evt.dataTransfer.getData(type);
          }
        }
      });
      end();
    }
  },
});

const DragSortable = makeWebComponent('drag-sortable', {
  attributes: {
    type: 'text/plain;text/html',
    outsideEffect: 'copy',
  },
  methods: {
    handleDrop(evt) {
      const target = evt.target.closest('drop-zone');
      const container = this;
      if (element_being_dragged.parentElement === container) {
        container.insertBefore(element_being_dragged, target);
      } else {
        if (container.outsideEffect === 'copy') {
          container.insertBefore(element_being_dragged.cloneNode(true), target); 
        } else {
          container.insertBefore(element_being_dragged, target);
        }
      }
      container.render();
      return true;
    },
    render() {
      const dz = new DropZone();
      const container = this;
      const handleDrop = this.handleDrop.bind(this);
      dz.type = container.type;
      dz.effect = 'move';
      [...this.querySelectorAll('drop-zone')].forEach(elt => elt.remove());
      [...this.querySelectorAll('drag-item')].forEach(elt => {
        const dzClone = dz.cloneNode(true);
        dzClone.handleDrop = handleDrop;
        container.insertBefore(dzClone, elt);
      });
      const _dz = dz.cloneNode(true);
      _dz.handleDrop = handleDrop;
      container.appendChild(_dz);
    },
  },
});

module.exports = {
  DragItem,
  DropZone,
  DragSortable,
  dragged: () => element_being_dragged,
  dragEnd: end,
}