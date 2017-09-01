/**
# Events
*/
/* jshint latedef:false */
/* global module, console, window, require, KeyboardEvent */

'use strict';

const {findWithin} = require('./b8r.dom.js');
const {get, registered, call} = require('./b8r.registry.js');
const anyElement = require('./b8r.anyElement.js');
const keys = require('./b8r.keystroke.js');
const {pathSplit} = require('./b8r.byPath.js');

const implicit_event_types = [
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'click',
  'mouseleave', 'mouseenter',
  'mousewheel', 'scroll', // FIXEME passive?!
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
  if (!(element instanceof Element)) {
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

/**

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

function on (...args) {
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
}

function off (...args) {
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
}

/**
## Enabling and Disabling Event Handlers

Convenience methods for (temporarily) enabling and disabling event handlers.

Will not play nicely with event handler creation / removal.

    enable(element, include_children); // include_children defaults to false

Returns data-event-disabled attributes to data-event attributes.

    disable(element, include_children);

Finds all data-event bindings on elements within the specified target and
turns them into data-event-disabled attributes;
*/

const disable = (element, include_children) => {
  const elements = include_children ? findWithin(element, true) : [element];
  elements.forEach(elt => {
    elt.setAttribute('data-event-disabled', elt.getAttribute('data-event'));
    elt.removeAttribute('data-event');
    if (elt.disabled === false) {
      elt.disabled = true;
    }
  });
};

const enable = (element, include_children) => {
  const elements = include_children ? findWithin(element, true) : [element];
  elements.forEach(elt => {
    elt.setAttribute('data-event', elt.getAttribute('data-event-disabled'));
    elt.removeAttribute('data-event-disabled');
    if (elt.disabled === true) {
      elt.disabled = false;
    }
  });
};

const dispatch = (type, target) => {
  const event = new Event(type);
  target.dispatchEvent(event);
  return event;
};

// add touch events if needed
if (window.TouchEvent) {
  ['touchstart', 'touchcancel', 'touchmove', 'touchend'].forEach(
      type => implicit_event_types.push(type));
}

const get_component_with_method = function(element, path) {
  var component_id = false;
  element = element.closest('[data-component-id]');
  while (element instanceof Element) {
    if (get(`${element.getAttribute('data-component-id')}.${path}`) instanceof Function) {
      component_id = element.getAttribute('data-component-id');
      break;
    }
    element = element.parentElement.closest('[data-component-id]');
  }
  return component_id;
};

/**
    b8r.callMethod(method_path, ...args)
    b8r.callMethod(model, method, ...args);

Call a method by name from a registered method. If the relevant model has not
yet been registered (e.g. it's being loaded asynchronously) it will get the
message when it's registered.
*/

var saved_messages = [];  // {model, method, evt}

function saveMethodCall(model, method, args) {
  saved_messages.push({model, method, args});
}

const play_saved_messages = for_model => {
  var playbackQueue = [];
  for (var i = saved_messages.length - 1; i >= 0; i--) {
    if (saved_messages[i].model === for_model) {
      playbackQueue.push(saved_messages[i]);
      saved_messages.splice(i, 1);
    }
  }
  while (playbackQueue.length) {
    var {model, method, args} = playbackQueue.pop();
    callMethod(model, method, ...args);
  }
};

const callMethod = (...args) => {
  var model, method;
  try {
    if (args[0].match(/[\[.]/)) {
      [method, ...args] = args;
      [model, method] = pathSplit(method);
    } else {
      [model, method, ...args] = args;
    }
  } catch (e) {
    debugger;  // jshint ignore:line
  }
  var result = null;
  if (registered(model)) {
    result = call(`${model}.${method}`, ...args);
  } else {
    // TODO queue if model not available
    // event is stopped from further propagation
    // provide global wrappers that can e.g. put up a spinner then call the
    // method
    saveMethodCall(model, method, args);
  }
  return result;
};

/**
    b8r.trigger(type, target, ...args); //

Trigger a synthetic implicit (only!) event. Note that you can trigger and
handle completely made-up events, but if you trigger events that occur
naturally the goal is for them to be handled exactly as if they were "real".
*/

const trigger = (type, target, ...args) => {
  if (
    typeof type !== 'string' ||
    (target && !(target.dispatchEvent instanceof Function))
  ) {
    console.error(
      'expected trigger(event_type, target_element)',
      type,
      target
    );
  }
  if (target) {
    const event = dispatch(type, target);
    if (target instanceof Element &&
        implicit_event_types.indexOf(type) === -1) {
      handle_event(event, ...args);
    }
  } else {
    console.warn('b8r.trigger called with no specified target');
  }
};

const handle_event = evt => {
  var target = anyElement;
  var keystroke = evt instanceof KeyboardEvent ? keys.keystroke(evt) : {};
  while (target) {
    var handlers = getParsedEventHandlers(target);
    var result = false;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      for (var type_index = 0; type_index < handler.types.length;
           type_index++) {
        if (handler.types[type_index] === evt.type &&
            (!handler.type_args[type_index] ||
             handler.type_args[type_index].indexOf(keystroke) > -1)) {
          if (handler.model && handler.method) {
            if (handler.model === '_component_') {
              handler.model = get_component_with_method(target, handler.method);
            }
            if (handler.model) {
              result = callMethod(handler.model, handler.method, evt, target);
            } else {
              console.warn(`_component_.${handler.method} not found`, target);
            }
          } else {
            console.error('incomplete event handler on', target);
            break;
          }
          if (result !== true) {
            evt.stopPropagation();
            evt.preventDefault();
            return;
          }
        }
      }
    }
    target = target === anyElement ? evt.target : target.parentElement;
  }
};

module.exports = {
  makeHandler,
  getEventHandlers,
  getParsedEventHandlers,
  on, off, enable, disable, dispatch, trigger, callMethod,
  implicit_event_types, get_component_with_method, handle_event, play_saved_messages,
};

