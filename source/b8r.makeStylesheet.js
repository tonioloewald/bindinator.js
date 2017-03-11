/**
# Make Stylesheet
    makeStylesheet();
*/
/* global module, require */
'use strict';

const {create, text} = require('./b8r.dom.js');

module.exports = source => {
  const style = source ? create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.appendChild(text(source));
    document.head.appendChild(style);
  }
  return style;
};
