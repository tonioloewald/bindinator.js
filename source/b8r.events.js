/**
# Events
*/
/* jshint latedef:false */
/* global console, window, KeyboardEvent, Element */

import { findWithin } from './b8r.dom.js'
import { get, call } from './b8r.registry.js'
import anyElement from './b8r.anyElement.js'
import * as keys from './b8r.keystroke.js'
import { pathSplit } from './b8r.byPath.js'
import implicitEventTypes from './b8r.implicit-event-types.js'
import { dispatch } from './b8r.dispatch.js'

const onOffArgs = args => {
  var element; var eventType; var object; var method; var prepend = false
  if (typeof args[2] === 'object') {
    console.warn('b8r.on(element, type, OBJECT) is deprecated');
    [element, eventType, object] = args
    return on(element, eventType, object.model, object.method)
  } else if (args.length > 4 || typeof args[3] === 'string') {
    [element, eventType, object, method, prepend] = args
    if (typeof object !== 'string' || typeof method !== 'string') {
      console.error('implicit bindings are by name, not', object, method)
      return
    }
    method = object + '.' + method
  } else {
    [element, eventType, method, prepend] = args
  }
  if (!(element instanceof Element)) {
    console.error('bind bare elements please, not', element)
    throw new Error('bad argument')
  }
  return { element, eventType, path: method, prepend }
}

const getEventHandlers = (element) => {
  const source = element.dataset.event
  const existing = source
    ? source
      .replace(/\s*(^|$|[,:;])\s*/g, '$1').split(/[;\n]/)
      .filter(handler => handler.trim())
    : []
  return existing
}

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
  const handlers = getEventHandlers(element)
  try {
    return handlers.map(function (instruction) {
      const [type, handler] = instruction.split(':')
      if (!handler) {
        if (instruction.indexOf('.')) {
          console.error('bad event handler (missing event type)', instruction, 'in', element)
        } else {
          console.error('bad event handler (missing handler)', instruction, 'in', element)
        }
        return { types: [] }
      }
      const handlerParts = handler.trim().match(/^([^.]+)\.(.+)$/)
      if (!handlerParts) throw new Error(`bad event handler "${handler}"`)
      const [, model, method] = handlerParts
      const types = type.split(',').sort()
      return {
        types: types.map(s => s.split('(')[0].trim()),
        typeArgs: types.map(s => {
          if (s.substr(0, 3) === 'key') {
            s = s.replace(/Key|Digit/g, '')
            // Allows for a key to be Cmd in Mac and Ctrl in Windows
            s = s.replace(/CmdOrCtrl/g, navigator.userAgent.indexOf('Macintosh') > -1 ? 'meta' : 'ctrl')
          }
          var args = s.match(/\(([^)]+)\)/)
          return args && args[1] ? args[1].split(',') : false
        }),
        model,
        method
      }
    })
  } catch (e) {
    console.error('fatal error in event handler', e)
    return []
  }
}

const makeHandler = (eventType, method) => {
  if (typeof eventType === 'string') {
    eventType = [eventType]
  }
  if (!Array.isArray(eventType)) {
    console.error('makeHandler failed; bad eventType', eventType)
    return
  }
  return eventType.sort().join(',') + ':' + method
}

/**
    on(element, eventType, model_name, method_name);

creates an implicit event-binding data attribute:

    data-event="eventType:module_name.method_name"

Multiple handlers are semicolon-delimited (or you can use newlines), e.g.

    data-event="mouseover:_component_.show;mouseover:_component_.hide"

or:

    data-event="
      mouseover:_component_.show
      mouseover:_component_.hide
    "

You can bind multiple event types separated by commas, e.g.

    data-event="click,keyup:do.something"

**Note**: if you link two event types to the same method separately they will NOT be collated.

You can remove an implicit event binding using:

    off(element, eventType, model_name, method_name);

### Keyboard Events

To make it easy to handle specific keystrokes, you can bind to keystrokes by name, e.g.

    data-bind="keydown(meta-KeyS)"

For your convenience, there's a *Keyboard Event Utility*.
*/

// TODO use parsed event handlers to do this properly
function on (...args) {
  const { element, eventType, path, prepend } = onOffArgs(args)
  const handler = makeHandler(eventType, path)
  const existing = getEventHandlers(element)
  if (existing.indexOf(handler) === -1) {
    if (prepend) {
      existing.unshift(handler)
    } else {
      existing.push(handler)
    }
    element.dataset.event = existing.join(';')
  }
}

// TODO use parsed event handlers to do this properly
function off (...args) {
  var element, eventType, object, method
  if (args.length === 4) {
    [element, eventType, object, method] = args
    method = object + '.' + method
  } else if (args.length === 3) {
    [element, eventType, method] = args
  } else {
    throw new Error('b8r.off requires three or four arguments')
  }
  const existing = element.dataset.event.split(';')
  const handler = makeHandler(eventType, method)
  const idx = existing.indexOf(handler)
  if (idx > -1) {
    existing.splice(idx, 1)
    if (existing.length) {
      element.dataset.event = existing.join(';')
    } else {
      if (element.dataset.event) {
        delete element.dataset.event
      }
    }
  }
}

/**
## Enabling and Disabling Event Handlers

Convenience methods for (temporarily) enabling and disabling event handlers.

Will not play nicely with event handler creation / removal.

    enable(element, includeChildren); // includeChildren defaults to false

Returns data-event-disabled attributes to data-event attributes.

    disable(element, includeChildren);

Finds all data-event bindings on elements within the specified target and
turns them into data-event-disabled attributes;
*/

const disable = (element, includeChildren) => {
  const elements = includeChildren ? findWithin(element, '[data-event]', true) : [element]
  elements.forEach(elt => {
    if (elt.dataset.event) {
      elt.dataset.eventDisabled = elt.dataset.event
      if (elt.dataset.event) {
        delete elt.dataset.event
      }
    }
    if (!elt.disabled) {
      elt.disabled = true
    }
  })
}

const enable = (element, includeChildren) => {
  const elements = includeChildren ? findWithin(element, '[data-event-disabled]', true) : [element]
  elements.forEach(elt => {
    if (elt.dataset.eventDisabled) {
      elt.dataset.event = elt.dataset.eventDisabled
      if (elt.dataset.eventDisabled) {
        delete elt.dataset.eventDisabled
      }
    }
    if (elt.disabled) {
      elt.disabled = false
    }
  })
}

// add touch events if needed
if (window.TouchEvent) {
  ['touchstart', 'touchcancel', 'touchmove', 'touchend'].forEach(
    type => implicitEventTypes.push(type))
}

const getComponentWithMethod = function (element, path) {
  var componentId = false
  element = element.closest('[data-component-id]')
  while (element instanceof Element) {
    if (get(`${element.dataset.componentId}.${path}`) instanceof Function) {
      componentId = element.dataset.componentId
      break
    }
    element = element.parentElement.closest('[data-component-id]')
  }
  return componentId
}

/**
## Calling Event Handlers

You can, of course, call any registered function via `b8r.get('path.to.function')(...args)`
and there's a convenience function that reduces this to `b8r.call('path.to.function', ...args)`.
Finally, there's `callMethod` which is provided for convenience (e.g. when calling a component's
methods, given its `componentId`):

    b8r.callMethod('path', 'to.method', ...args)

It also supports the same syntax as `b8r.call(…)`:

    b8r.callMethod('path.to.function', ...args)
*/

const callMethod = (...args) => {
  var model, method
  try {
    if (args[0].match(/[[.]/)) {
      [method, ...args] = args;
      [model, method] = pathSplit(method)
    } else {
      [model, method, ...args] = args
    }
  } catch (e) {
    throw new Error('callMethod has bad arguments')
  }
  return call(`${model}.${method}`, ...args)
}

const handleEvent = (evt) => {
  var target = anyElement
  var args = evt.args || []
  var keystroke = evt instanceof KeyboardEvent ? keys.keystroke(evt) : {}
  while (target) {
    var handlers = getParsedEventHandlers(target)
    var result = false
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i]
      for (var typeIndex = 0; typeIndex < handler.types.length;
        typeIndex++) {
        if (handler.types[typeIndex] === evt.type &&
            (!handler.typeArgs[typeIndex] ||
             handler.typeArgs[typeIndex].indexOf(keystroke) > -1)) {
          if (handler.model && handler.method) {
            if (handler.model === '_component_') {
              handler.model = getComponentWithMethod(target, handler.method)
            }
            if (handler.model) {
              result = callMethod(handler.model, handler.method, evt, target, ...args)
            } else {
              console.warn(`_component_.${handler.method} not found`, target)
            }
          } else {
            console.error('incomplete event handler on', target)
            break
          }
          if (result !== true) {
            evt.stopPropagation()
            evt.preventDefault()
            return
          }
        }
      }
    }
    target = target === anyElement ? evt.target.closest('[data-event]') : target.parentElement.closest('[data-event]')
  }
}

/**
# Triggering Events

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
      'expected trigger(eventType, target_element)',
      type,
      target
    )
    return
  }
  if (target) {
    const event = dispatch(type, target, ...args)
    if (target instanceof Element && implicitEventTypes.indexOf(type) === -1) {
      handleEvent(event)
    }
  } else {
    console.warn('b8r.trigger called with no specified target')
  }
}

/**
## Handling Other Event Types

  b8r.implicitlyHandleEventsOfType(type_string)

Adds implicit event handling for a new event type. E.g. you might want
to use `data-event` bindings for the seeking `media` event, which you
could do with `b8r.implicitlyHandleEventsOfType('seeking')`.
*/

const implicitlyHandleEventsOfType = type => {
  if (implicitEventTypes.indexOf(type) === -1) {
    implicitEventTypes.push(type)
    document.body.addEventListener(type, handleEvent, true)
  }
}

export {
  makeHandler,
  getEventHandlers,
  getParsedEventHandlers,
  dispatch, trigger,
  on, off, enable, disable, callMethod,
  implicitlyHandleEventsOfType,
  implicitEventTypes, getComponentWithMethod, handleEvent
}
