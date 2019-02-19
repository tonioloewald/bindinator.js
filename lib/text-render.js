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

import b8r from '../source/b8r.js'
import { viaLink } from '../source/b8r.makeStylesheet.js'
import { viaTag } from '../lib/scripts.js'

viaLink('third-party/prism-okaidia.css')

export const code = async (elt, source = false, language = false) => {
  const { Prism } = await viaTag('third-party/prism.min.js')

  if (language) elt.classList.add(`language-${language}`)
  if (source !== false) elt.textContent = source.trim()
  Prism.highlightElement(elt)
}

export const md = async (elt, source) => {
  const { showdown } = await viaTag('third-party/showdown.min.js')

  var converter = new showdown.Converter()
  elt.innerHTML = converter.makeHtml(source)
  // showdown incorrectly wraps custom-elements in paragraphs
  b8r.findWithin(elt, 'b8r-component').forEach(c => b8r.unwrap(c))
  b8r.findWithin(elt, 'pre').forEach(pre => {
    const language = pre.textContent.trim()[0] === '<' ? 'markup' : 'js'
    code(pre, false, language)
  })
  b8r.bindAll(elt)
}
