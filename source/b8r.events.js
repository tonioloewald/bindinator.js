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
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'click', 'dblclick',
  'mouseleave', 'mouseenter',
  'mousewheel', 'scroll', // FIXEME passive?!
  'contextmenu',
  'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
  'transitionend', 'animationend',
  'input', 'change',
  'keydown', 'keyup',
  'cut', 'copy', 'paste',
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
  const source = element.dataset.event;
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
  const handlers = getEventHandlers(element);
  return handlers.map(function(instruction){
    const [type, handler] = instruction.split(':');
    if (!handler) {
      if(instruction.indexOf('.')) {
        console.error('bad event handler (missing event type)', instruction, 'in', element);
      } else {
        console.error('bad event handler (missing handler)', instruction, 'in', element);
      }
      return { types: [] };
    }
    const [, model, method] = handler.trim().match(/^([^\.]+)\.(.+)$/);
    const types = type.split(',').sort();
    return {
      types: types.map(s => s.split('(')[0].trim()),
      type_args: types.map(s => {
        if (s.substr(0,3) === 'key') {
          s = s.replace(/Key|Digit/g, '');
          // Allows for a key to be CMD in Mac and Ctrl in Windows
          s = s.replace(/CmdOrCtrl/g, navigator.userAgent.indexOf('Macintosh') > -1 ? 'meta' : 'ctrl');
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

// TODO use parsed event handlers to do this properly
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
    element.dataset.event = existing.join(';');
  }
}

// TODO use parsed event handlers to do this properly
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
  const existing = element.dataset.event.split(';');
  const handler = makeHandler(event_type, method);
  const idx = existing.indexOf(handler);
  if (idx > -1) {
    existing.splice(idx, 1);
    if (existing.length) {
      element.dataset.event = existing.join(';');
    } else {
      if (element.dataset.event) {
        delete element.dataset.event;
      }
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
  const elements = include_children ? findWithin(element, '[data-event]', true) : [element];
  elements.forEach(elt => {
    if (elt.dataset.event) {
      elt.dataset.eventDisabled = elt.dataset.event;
      if (elt.dataset.event) {
        delete elt.dataset.event;
      }
    }
    if (!elt.disabled) {
      elt.disabled = true;
    }
  });
};

const enable = (element, include_children) => {
  const elements = include_children ? findWithin(element, '[data-event-disabled]', true) : [element];
  elements.forEach(elt => {
    if (elt.dataset.eventDisabled) {
      elt.dataset.event = elt.dataset.eventDisabled;
      if (elt.dataset.eventDisabled) {
        delete elt.dataset.eventDisabled;
      }
    }
    if (elt.disabled) {
      elt.disabled = false;
    }
  });
};

const dispatch = (type, target, ...args) => {
  const event = new Event(type);
  event.args = args;
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
    if (get(`${element.dataset.componentId}.${path}`) instanceof Function) {
      component_id = element.dataset.componentId;
      break;
    }
    element = element.parentElement.closest('[data-component-id]');
  }
  return component_id;
};

/**
## Calling Event Handlers

You can, of course, call any registered method via `b8r.get('path.to.function')(...args)`
and there's even a convenient method that reduces this to `b8r.call('path.to.function', ...args)`.
But `b8r.callMethod` is specifically used to call event handlers because it allows for the case
where the event occurs *before the handler has been registered*. So, in particular, if you
load component which calls a method that the component's script will register *afterwards* or which
relies on, say, a library that is being asynchronously loaded, you can still just write the handler
as normal and, under the hood, it will be saved and executed when the method is registered.

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
    debugger;  // eslint-disable-line no-debugger
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
### Triggering Events

Sometimes you will want to simulate a user action, e.g. click a button as though
the user clicked it, rather than call a handler directly. In vanilla javascript you can to
this specifically via `button.click()` but in a more general sense you can use
`element.dispatchEvent(new Event('click'))`.

b8r provides a convenience method that wraps all this stuff up but, more importantly, is
aware of which events b8r itself handles so it can short-circuit the event propagation system
(effectively route the call directly to the relevant event-handler and pass arguments directly
to it).

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
    return;
  }
  if (target) {
    const event = dispatch(type, target, ...args);
    if (target instanceof Element &&
        implicit_event_types.indexOf(type) === -1) {
      handle_event(event);
    }
  } else {
    console.warn('b8r.trigger called with no specified target');
  }
};

const handle_event = evt => {
  var target = anyElement;
  var args = evt.args || [];
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
              result = callMethod(handler.model, handler.method, evt, target, ...args);
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
    target = target === anyElement ? evt.target.closest('[data-event]') : target.parentElement.closest('[data-event]');
  }
};

/**
## Handling Other Event Types

  b8r.implicitlyHandleEventsOfType(type_string)

Adds implicit event handling for a new event type. E.g. you might want
to use `data-event` bindings for the seeking `media` event, which you
could do with `b8r.implicitlyHandleEventsOfType('seeking')`.
*/

module.exports = {
  makeHandler,
  getEventHandlers,
  getParsedEventHandlers,
  on, off, enable, disable, dispatch, trigger, callMethod,
  implicit_event_types, get_component_with_method, handle_event, play_saved_messages,
};
