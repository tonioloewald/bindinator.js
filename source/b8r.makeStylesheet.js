/**
# Make Stylesheet

Usage:

    makeStylesheet('... css source ...');

Inserts the source in a `<style>` tag and sticks in in the document head.
*/
/* global module, require */
'use strict';

const {create, text} = require('./b8r.dom.js');

module.exports = (source, title) => {
  const style = source ? create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.setAttribute('data-title', title);
    style.appendChild(text(source));
    document.head.appendChild(style);
  }
  return style;
};
