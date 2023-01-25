/**
# dispatch

    dispatch('click', target, ...args);

Synthesizes a native event. Don't use it for custom events. Use `trigger` instead.
*/
/* global Event */

// TODO -- provide better support for keyboard, mouse, touch events
export const dispatch = (type, target, ...args) => {
  const event = new Event(type)
  event.args = args
  target.dispatchEvent(event)
  if (event.target !== target) {
    // in some cases dispatchEvent will fail to set an event's target property (!)
    return { type, target, args }
  } else {
    return event
  }
}
