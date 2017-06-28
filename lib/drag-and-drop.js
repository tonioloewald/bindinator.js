/**
# Drag and Drop

HTML5-based drag and drop — a very lightweight library building on top of HTML5 drag
and drop behavior.

**Note**: right now this module is doesn't return anything.

It sets up some global event handlers and just works (arguably, it merely does things
that the browser should do, such as add a CSS selector for drop zones that are compatible
with what's being dragged).

Eventually, there will be utility methods for things like creating draggable elements
on-the-fly (which you really shouldn't need to do) and creating virtual drop targets
e.g. in between other elements to allow drag and drop rearrangement.

This module uses but does not define the following class selectors:

- `.drag-source` an element being dragged
- `.drag-target` an element on which the dragged object may be dropped
- `.drag-over` a `.drag-target` which the object is being dragged over

You may also wish to create style rules for:

- `[draggable="true"]` anything other than a `<a>` that can be dragged
- `[data-drag]` indicates types of draggable things (but they won't be draggable without above
- `[data-drop]` indicates potential drop zones

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

To create a drop zone, use the data-drop attribute set to a semicoloon-delimited lsit
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
  set({
    drop: evt => {
      evt.target.textContent = 'received types: ' + b8r.makeArray(evt.dataTransfer.types).join(', ');
    }
  })
</script>
```
*/
/* global require, module */
'use strict';

const b8r = require('source/b8r.js');

const array_intersection = (A, B) => A.filter(a => B.indexOf(a) > -1);

const is_type_allowed = (allowed_types, type) => {
  let is_allowed = false;
  b8r.forEach(allowed_types, allowed_type => {
    if (allowed_type === 'special/any') {
      is_allowed = true;
      return false;
    } else if (allowed_type.indexOf('*') > -1) {
      let [A,B] = allowed_type.split('/');
      let [a,b] = type.split('/');
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

const mark_droppable = types => {
  const elements = b8r.find('[data-drop]');
  elements.forEach(element => {
    const drop_types = element.getAttribute('data-drop').split(';');
    if (types.find(type => is_type_allowed(drop_types, type))) {
      element.classList.add('drag-target');
    } else {
      element.classList.remove('drag-target');
    }
  });
};

const trim = s => s.trim();

const dnd = {
  start (evt) {
    const target = evt.target.closest('[draggable="true"],a[href]');
    if (!target) {
      return;
    }
    target.classList.add('drag-source');
    const types = target.matches('[draggable="true"]') ?
                  (target.getAttribute('data-drag') || 'text/html').split(';').map(trim) :
                  (target.getAttribute('data-drag') || 'url').split(';').map(trim) ;
    types.forEach(type => {
      const content = target.getAttribute('data-drag-content') ||
                      (type === 'text/html' ? target.innerHTML : target.textContent);
      evt.dataTransfer.setData(type, content);
    });
    mark_droppable(types);
    return true;
  },
  drag (evt) {
    const target = evt.target.closest('.drag-target');
    if(target) {
      target.classList.add('drag-over');
      evt.dataTransfer.dropEffect = 'copy';
    } else {
      return true;
    }
  },
  leave () {
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
        if (is_type_allowed(b8r.makeArray(evt.dataTransfer.types), type)) {
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
    b8r.find('.drag-source').forEach(elt => elt.classList.remove('drag-source'));
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
