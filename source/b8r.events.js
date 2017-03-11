/**
# Events
*/
/* global module, console */
(function(module){
'use strict';
  const {findWithin} = './b8r.dom.js';

  const implicit_event_types = [
    'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'click',
    'mousewheel', 'scroll',
    'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
    'transitionend', 'animationend',
    'input', 'change',
    'keydown', 'keyup',
    'focus', 'blur' // more to follow
  ];

  const onOffArgs = args => {
    var element, event_type, object, method, prepend = false;
    if(typeof args[2] === 'object') {
      console.warn('b8r.on(element, type, OBJECT) is deprecated');
      [element, event_type, object] = args;
      return on(element, event_type, object.model, object.method);
    } else if(args.length > 4 || typeof args[3] === 'string') {
      [element, event_type, object, method, prepend] = args;
      if(typeof object !== 'string' || typeof method !== 'string') {
        console.error('implicit bindings are by name, not', object, method);
        return;
      }
      method = object + '.' + method;
    } else {
      [element, event_type, method, prepend] = args;
    }
    if (!(element instanceof HTMLElement)) {
      console.error('bind bare elements please, not', element);
      throw 'bad argument';
    }
    return {element, event_type, path: method, prepend};
  };

  const getEventHandlers = (element) => {
    const source = element.getAttribute('data-event');
    const existing = source ?
                     source.
                     replace(/\s*(^|$|[,:;])\s*/g, '$1').split(';').
                     filter(handler => handler.trim()) :
                     [];
    return existing;
  };

  /*

    b8r.getParsedEventHandlers(element)

returns an array of parsed implicit event handlers for an element, e.g.

    data-event="type1:model1.method1;type2,type3:model2.method2"

is returned as

    [
      { types: ["type1"], model: "model1", method: "method1"},
      { types: ["type2", "type3"], model: "model2", method: "method2"}
    ]
*/
  const getParsedEventHandlers = element => {
    var handlers = getEventHandlers(element);
    return handlers.map(function(instruction){
      var [type, handler] = instruction.split(':');
      if (!handler) {
        if(instruction.indexOf('.')) {
          console.error('bad event handler (missing event type)', instruction, 'in', element);
        } else {
          console.error('bad event handler (missing handler)', instruction, 'in', element);
        }
        return { types: [] };
      }
      var [model, method] = handler.trim().split('.');
      var types = type.split(',').sort();
      return {
        types: types.map(s => s.split('(')[0].trim()),
        type_args: types.map(s => {
          if (s.substr(0,3) === 'key') {
            s = s.replace(/Key|Digit/g, '');
          }
          var args = s.match(/\(([^)]+)\)/);
          return args && args[1] ? args[1].split(',') : false;
        }),
        model,
        method,
      };
    });
  };

  const makeHandler = (event_type, method) => {
    if (typeof event_type === 'string') {
      event_type = [event_type];
    }
    if(!Array.isArray(event_type)) {
      console.error('makeHandler failed; bad event_type', event_type);
      return;
    }
    return event_type.sort().join(',') + ':' + method;
  };

/**
    on(element, event_type, model_name, method_name);

creates an implicit event-binding data attribute:

    data-event="event_type:module_name.method_name"

Multiple handlers are semicolon-delimited, e.g.

    data-event="mouseover:_component_.show;mouseover:_component_.hide"

You can bind multiple event types separated by commas, e.g.

    data-event="click,keyup:do.something"

**Note**: if you link two event types to the same method separately they will NOT be collated.

You can remove an implicit event binding using:

    off(element, event_type, model_name, method_name);

### Keyboard Events

To make it easy to handle specific keystrokes, you can bind to keystrokes by name, e.g.

    data-bind="keydown(meta-KeyS)"

For your convenience, there's a *Keyboard Event Utility*.
*/

  const on = (...args) => {
    const {element, event_type, path, prepend} = onOffArgs(args);
    const handler = makeHandler(event_type, path);
    const existing = getEventHandlers(element);
    if(existing.indexOf(handler) === -1) {
      if (prepend) {
        existing.unshift(handler);
      } else {
        existing.push(handler);
      }
    }
    element.setAttribute('data-event', existing.join(';'));
  };

  const off = (...args) => {
    var element, event_type, object, method;
    if(args.length === 4) {
      [element, event_type, object, method] = args;
      method = object + '.' + method;
    } else if (args.length === 3) {
      [element, event_type, method] = args;
    } else {
      throw 'b8r.off requires three or four arguments';
    }
    const existing = element.getAttribute('data-event').split(';');
    const handler = makeHandler(event_type, method);
    const idx = existing.indexOf(handler);
    if (idx > -1) {
      existing.splice(idx, 1);
      if (existing.length) {
        element.setAttribute('data-event', existing.join(';'));
      } else {
        element.removeAttribute('data-event');
      }
    }
  };

/**
## Enabling and Disabling Event Handlers

Convenience methods for (temporarily) enabling and disabling event handlers.

Will not play nicely with event handler creation / removal.

    enable(element);

Returns data-event-disabled attributes to data-event attributes.

    disable(element);

Finds all data-event bindings on elements within the specified target and
turns them into data-event-disabled attributes;
*/

  const disable = within_elt => {
    findWithin(within_elt, '[data-event]').forEach(elt => {
      elt.setAttribute('data-event-disabled', elt.getAttribute('data-event'));
      elt.removeAttribute('data-event');
    });
  };

  const enable = within_elt => {
    findWithin(within_elt, '[data-event-disabled]').forEach(elt => {
      elt.setAttribute('data-event', elt.getAttribute('data-event-disabled'));
      elt.removeAttribute('data-event-disabled');
    });
  };

  const dispatch = (type, target) => {
    const event = new Event(type);
    target.dispatchEvent(event);
    return event;
  };

  module.exports = {makeHandler, getEventHandlers, getParsedEventHandlers, on, off, enable, disable, dispatch, implicit_event_types};
}(module));
