/**
# Show and Hide
*/
/* global module */
'use strict';

const {findWithin} = require('./b8r.dom.js');

const dispatch = (type, target) => {
  const event = new Event(type);
  target.dispatchEvent(event);
};

const show = element => {
  if (element.style.display === 'none') {
    element.style.display = element.getAttribute('data-orig-display') || '';
    findWithin(element, '[data-event*="show"]').forEach(elt => dispatch('show', elt));
  }
};

const hide = element => {
  if (element.getAttribute('data-orig-display') === null && (element.style.display && element.style.display !== 'none')) {
    element.setAttribute('data-orig-display', element.style.display);
    findWithin(element, '[data-event*="hide"]').forEach(elt => dispatch('hide', elt));
  }
  element.style.display = 'none';
};

module.exports = {show, hide};
