/**
# Drag and Drop

HTML5-based drag and drop

To create a draggable element, add `draggable="true"`. To specify 

```
<style>
.drag-source {
  box-shadow: 0 0 2px 2px green;
  opacity: 0.5;
}
.drag-target {
  box-shadow: 0 0 1px 1px blue;
}
.drag-target.drag-over {
  box-shadow: 0 0 2px 2px blue;
}
.drag,
[draggable="true"] {
  border: 1px solid rgba(0,0,255,0.5);
  cursor: pointer;
  display: block;
}

.drag,
.drag-target,
[data-drop],
[draggable="true"] {
  background: rgba(255,255,255,0.75);
  padding: 4px;
  margin: 4px;
  border-radius: 5px;
}
</style>
<p>
  Links are draggable by default
</p>
<a class="drag" href="http://bindinator.com">Links are draggable by default</a>
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
<div data-drop="text/html">
  You can drop stuff here
</div>
<div data-drop="text/html">
  You can drop HTML here
</div>
<div data-drop="text/plain">
  You can drop plain text here
</div>
<div data-drop="text/html;url">
  You can drop HTML or urls here
</div>
```
*/
/* global require, module */
'use strict';

const b8r = require('source/b8r.js');
const uuid = require('lib/uuid.js');

const array_intersection = (A, B) => A.filter(a => B.indexOf(a) > -1);

const mark_droppable = types => {
  const elements = b8r.find('[data-drop]');
  elements.forEach(element => {
    const drop_types = element.getAttribute('data-drop').split(';');
    if (array_intersection(drop_types, types).length) {
      element.classList.add('drag-target');
    } else {
      element.classList.remove('drag-target');
    }
  });
};

const dnd = {
  start (evt) {
    const target = evt.target.closest('[draggable="true"],a[href]');
    if (!target) {
      return;
    }
    target.classList.add('drag-source');
    const types = target.matches('[draggable="true"]') ?
                  (target.getAttribute('data-drag') || 'text/html').split(';') :
                  (target.getAttribute('data-drag') || 'url').split(';') ;
    types.forEach(type => {
      const content = target.getAttribute('data-drag-content') || 
                      (type === 'text/html' ? target.innerHTML : target.textContent);
      evt.dataTransfer.setData(type, content);
    });
    mark_droppable(types);
    return true;
  },
  drag (evt) {
    if(evt.target.closest('.drag-target')) {
      evt.dataTransfer.dropEffect = 'copy';
    } else {
      return true;
    }
  },
  leave (evt) {
    const target = b8r.findOne('.drag-over');
    if (target) {
      target.classList.remove('drag-over');
    }
  },
  drop (evt) {
    const target = evt.target.closest('.drag-target');
    if (target) {
      const drop_types = target.getAttribute('data-drop').split(';');
      b8r.forEach(drop_types, type => {
        if (evt.dataTransfer.types.includes(type)) {
          if (type === 'text/html') {
            target.innerHTML = evt.dataTransfer.getData(type);
          } else {
            target.textContent = evt.dataTransfer.getData(type);
          }
          return false;
        }
      });
    } else {
      return true;
    }
  },
  end () {
    b8r.findOne('.drag-source').classList.remove('drag-source');
    b8r.find('.drag-target').forEach(elt => elt.classList.remove('drag-target'));
  },
};

b8r.register('drag-and-drop', dnd);
b8r.on(document.body, 'dragstart', 'drag-and-drop.start');
b8r.on(document.body, 'dragenter,dragover', 'drag-and-drop.drag');
b8r.on(document.body, 'drop', 'drag-and-drop.drop');
b8r.on(document.body, 'dragleave', 'drag-and-drop.leave');
b8r.on(document.body, 'dragend', 'drag-and-drop.end');

module.exports = {};