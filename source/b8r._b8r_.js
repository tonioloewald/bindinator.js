/**
## `_b8r_` — Built-in Event Handlers

The _b8r_ object is registered by default as a useful set of always available
methods, especially for handling events.

You can use them the obvious way:

    <button data-event="click:_b8r_.echo">
      Click Me, I cause console spam
    </button>

    _b8r_.echo // logs events to the console
    _b8r_.stopEvent // use this to simply catch an event silently
    _b8r_._update_ // this is used by b8r to update models automatically
*/

import { getBindings } from './b8r.bindings.js'
import * as fromTargets from './b8r.fromTargets.js'

export default (b8r) => {
  const hasFromTarget = (t) => fromTargets[t.target]

  b8r._register('_b8r_', {
    echo: evt => console.log(evt) || true,
    stopEvent: () => {},
    _update_: evt => {
      let elements = b8r.findAbove(evt.target, '[data-bind]', null, true)
      // update elements with selected fromTarget
      if (evt.target.tagName === 'SELECT') {
        const options = b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])')
        elements = elements.concat(options)
      }
      elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
        const bindings = getBindings(elt)
        for (let i = 0; i < bindings.length; i++) {
          const { targets, path } = bindings[i]
          const boundTargets = targets.filter(hasFromTarget)
          const processFromTargets = t => { // jshint ignore:line
            // all bets are off on bound values!
            const value = fromTargets[t.target](elt, t.key)
            if (value !== undefined) {
              delete elt._b8r_boundValues
              b8r.setByPath(path, value, elt)
            }
          }
          boundTargets.forEach(processFromTargets)
        }
      })
      return true
    }
  })
}
