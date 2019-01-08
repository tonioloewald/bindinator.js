/**
# draggable and droppable elements

This library provides two custom elements:
- `<drag-item>`
- `<drop-zone>`

Both items support a `type` attribute, which is a semicolon-delimited set of "mime-types".

The `<drag-item>` element supports a `content` attribute which replaces the default content
of the element when dropped.

The `<drop-zone>` element supports an `effect` attribute, which can be 'copy' (the default) or 'move'.

And a two methods:
- `dragEnd()` // cleans up drag operation
- `dragged()` // returns the `<drag-item>` being dragged or `true` for something dragged from outside


```
<style>
  drag-item,
  drop-zone {
    display: block;
    padding: 10px 20px;
    margin: 5px;
    background: #ddd;
    border-radius: 5px;
  }
  .drag-source {
    box-shadow: inset 0 0 0 2px yellow;
    opacity: 0.5;
  }
  .drag-target {
    box-shadow: inset 0 0 0 2px blue;
  }
  .drag-over {
    background: rgba(0,0,255,0.25);
  }
</style>
<drag-item><b>Drag</b> Me A</drag-item>
<drag-item>Drag Me <b>B</b></drag-item>
<drag-item content="custom content">Drag Me <b>Custom Content</b></drag-item>
<drop-zone>Copy to Me</drop-zone>
<drop-zone effect="move">Move to Me</drop-zone>
<drop-zone effect="move" data-event="drop:_component_.drop">Move to Me</drop-zone>
<script>
  const {dragEnd} = require('web-components/drag-drop.js');
  set({
    drop(evt){
      console.log(evt.target.textContent = `Custom drop handler: ${evt.dataTransfer.getData('text/plain')}`);
      dragEnd();
    },
  })
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

const DraggableElement = makeWebComponent('drag-item', {
  attributes: {
    type: 'text/plain;text/html',
    content: 'auto',
  },
  eventHandlers: {
    dragstart (evt) {
      this.classList.add('drag-source');
      const types = evt.target.type.split(';');
      types.forEach(type => {
        const content = evt.target.content !== 'auto' ?
                        evt.target.content :
                        (type === 'text/html' ? evt.target.innerHTML : evt.target.textContent);
        evt.dataTransfer.setData(type, content);
      });
      mark_droppable(evt.dataTransfer.types, evt.target);
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
  if (evt.target.classList.contains('drag-target')) {
    evt.preventDefault();
    evt.stopPropagation();
    evt.target.classList.add('drag-over');
    evt.dataTransfer.dropEffect = evt.target.effect; 
  }
};

const end = () => {
  if (element_being_dragged && element_being_dragged.classList) {
    element_being_dragged.classList.remove('drag-source'); 
    element_being_dragged = null;
  }
  [...document.querySelectorAll('.drag-over')].forEach(elt => elt.classList.remove('drag-over'));
  [...document.querySelectorAll('.drag-target')].forEach(elt => elt.classList.remove('drag-target'));
};

document.body.addEventListener('dragend', end);

const DroppableElement = makeWebComponent('drop-zone', {
  attributes: {
    type: 'text/plain;text/html',
    effect: 'copy',
  },
  eventHandlers: {
    dragenter: drag,
    dragover: drag,
    dragleave () {
      this.classList.remove('drag-over');
    },
    drop (evt) {
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

module.exports = {
  DraggableElement,
  DroppableElement,
  dragged: () => element_being_dragged,
  dragEnd: end,
}