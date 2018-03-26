/**
# text-render

Utilities for rendering text.

## Code

    render.code(source, elt, language=false); // elt now contains source, rendered as language by prism.js

For example:

    render.code(source, elt, 'js');

Or:
    elt.classList.add('language-js');
    render.code(source, elt);

## Markdown

    render.ms(source, elt) -> markdup from showdown.js
*/
/* global require, module */
'use strict';

const b8r = require('../source/b8r.js');

const code = (source, elt, language=false) => {
  /* global Prism */
  if (language) elt.classList.add(`language-${language}`);
  require.lazy("https://cdnjs.cloudflare.com/ajax/libs/prism/1.5.1/prism.min.js").
  then(() => {
    elt.textContent = source.trim();
    Prism.highlightElement(elt);
  });
};

const md = (source, elt) => {
  require.lazy('https://cdnjs.cloudflare.com/ajax/libs/showdown/1.4.3/showdown.min.js').
  then(showdown => {
    var converter = new showdown.Converter();
    elt.innerHTML = converter.makeHtml(source);
    b8r.findWithin(elt, 'pre').forEach(pre => {
      const language = pre.textContent.match(/<\w+[^<>]*>/) ? 'markup' : 'js';
      code(pre.textContent, pre, language);
    });
    b8r.bindAll(elt);
  });
};

module.exports = {code, md};
