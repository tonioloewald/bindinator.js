/**
# Show and Hide

    show(element, ...); // show the element

Shows the element (via the CSS `display` value -- restoring a previously altered value where
appropriate). Triggers a synthetic `show` event on any elements with `show` event handlers
passing any additional arguments.

    hide(element, ...); // hide the element

Hides the element (storing its original `display` value in an attribute). Triggers a synthetic
`hide` event on any elements with `hide` event handlers passing any additional arguments.
*/
/* global module, require */
'use strict';

const {findWithin, isVisible} = require('./b8r.dom.js');
const {trigger} = require('./b8r.events.js');

const show = (element, ...args) => {
  if (! isVisible(element)) {
    if(element.dataset.origDisplay === undefined) {
      element.dataset.origDisplay = element.style.display === 'none' ? '' : element.style.display;
    }
    element.style.display = element.dataset.origDisplay;
    findWithin(element, '[data-event*="show"]', true)
        .forEach(elt => trigger('show', elt, ...args));
  }
};

const hide = (element, ...args) => {
  if (isVisible(element)) {
    if (element.dataset.origDisplay === undefined) {
      element.dataset.origDisplay = element.style.display;
      findWithin(element, '[data-event*="hide"]', true)
          .forEach(elt => trigger('hide', elt, ...args));
    }
    element.style.display = 'none';
  }
};

module.exports = {
  show,
  hide
};
