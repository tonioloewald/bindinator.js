/**
# Make Stylesheet

Usage:

    makeStylesheet('h1 { font-size: 100px; }', 'my style sheet');

Inserts the source in a `<style>` tag and sticks in in the document head. It will have the
supplied title as its `data-title` attribute;
*/
/* global module, require */
'use strict';

const {create, text} = require('./b8r.dom.js');

module.exports = (source, title) => {
  const style = source ? create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.dataset.title = title;
    style.appendChild(text(source));
    document.head.appendChild(style);
  }
  return style;
};
