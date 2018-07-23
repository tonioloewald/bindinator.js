/**
# text-render

Utilities for rendering text.

## Code

    render.code(elt, source=false, language=false); // elt now contains source, rendered as language by prism.js

If source is false, the element's existing content is rendered. If language is not false
then the element is marked with the class `language-${langage}`.

For example:

    render.code(elt, source, 'js');

Or:
    elt.classList.add('language-js');
    render.code(elt, source);

## Markdown

    render.md(elt, source) -> source in markdown rendered as html by showdown.js
*/
/* global require, module */
'use strict';

const b8r = require('../source/b8r.js');
const {viaLink} = require('../source/b8r.makeStylesheet.js');

viaLink('https://cdnjs.cloudflare.com/ajax/libs/prism/1.5.1/themes/prism.css');

const code = (elt, source=false, language=false) => {
  /* global Prism */
  if (language) elt.classList.add(`language-${language}`);
  require.lazy("https://cdnjs.cloudflare.com/ajax/libs/prism/1.5.1/prism.min.js").
  then(() => {
    if (source !== false) elt.textContent = source.trim();
    Prism.highlightElement(elt);
  });
};

const md = (elt, source) => {
  require.lazy('https://cdnjs.cloudflare.com/ajax/libs/showdown/1.4.3/showdown.min.js').
  then(showdown => {
    var converter = new showdown.Converter();
    elt.innerHTML = converter.makeHtml(source);
    b8r.findWithin(elt, 'pre').forEach(pre => {
      const language = pre.textContent.match(/<\w+[^<>]*>/) ? 'markup' : 'js';
      code(pre, false, language);
    });
    b8r.bindAll(elt);
  });
};

module.exports = {code, md};
