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
/* global module, require */
'use strict';

module.exports = b8r => {
  const {getBindings} = require('./b8r.bindings.js');
  const fromTargets = require('./b8r.fromTargets.js')(b8r);
  const hasFromTarget = t => fromTargets[t.target];

  b8r._register('_b8r_', {
    echo : evt => console.log(evt) || true,
    stopEvent : () => {},
    _update_ : evt => {
      let elements = b8r.findAbove(evt.target, '[data-bind]', null, true);
      // update elements with selected fromTarget
      if (evt.target.tagName === 'SELECT') {
        const options = b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])');
        elements = elements.concat(options);
      }
      elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
        const bindings = getBindings(elt);
        for (let i = 0; i < bindings.length; i++) {
          const { targets, path } = bindings[i];
          const bound_targets = targets.filter(hasFromTarget);
          const processFromTargets = t => { // jshint ignore:line
            // all bets are off on bound values!
            const value = fromTargets[t.target](elt, t.key);
            if (value !== undefined) {
              delete elt._b8rBoundValues;
              b8r.setByPath(path, value, elt);
            }
          };
          bound_targets.forEach(processFromTargets);
        }
      });
      return true;
    },
  });
};

