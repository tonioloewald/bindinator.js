/**
# Show and Hide
*/
/* global module, require */
'use strict';

const {findWithin} = require('./b8r.dom.js');
const {trigger} = require('./b8r.events.js');

const show = (element, ...args) => {
  if (element.style.display === 'none') {
    element.style.display = element.getAttribute('data-orig-display') || '';
    findWithin(element, '[data-event*="show"]', true)
        .forEach(elt => trigger('show', elt, ...args));
  }
};

const hide = (element, ...args) => {
  if (element.getAttribute('data-orig-display') === null &&
      (element.style.display && element.style.display !== 'none')) {
    element.setAttribute('data-orig-display', element.style.display);
    findWithin(element, '[data-event*="hide"]', true)
        .forEach(elt => trigger('hide', elt, ...args));
  }
  element.style.display = 'none';
};

module.exports = {
  show,
  hide
};
