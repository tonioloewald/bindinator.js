/**
# text-render

Utilities for rendering text.

## Code

    render.code(elt, source=false, language=false); // elt now contains source, loaded into ace-editor

If `source`` is not provided (falsy), the element's existing `textContent` is rendered.

If `language` is not provided, `code` will attempt to guess the language.

For example:

    render.code(elt, source, 'javascript');

## Markdown

    render.md(elt, source) -> source in markdown rendered as html by showdown.js

After markdown is rendered a custom event `md-render` is triggered on the container element.

### Tables

    render.md(elt, source, {renderTables: true})

This invokes the [markdown-tables](?source=lib/markdown-tables.js)
`renderTables` function to support **tables** embedded in markdown.
*/

import b8r from '../source/b8r.js'
import { viaTag } from '../lib/scripts.js'
import { elements } from '../source/elements.js'
import '../web-components/code-editor.js'

const { b8rCodeEditor } = elements
const codeStyle = {
  minHeight: '64px',
  maxHeight: '80vh'
}
export const code = (elt, source, mode) => {
  if (!source) {
    source = elt.textContent
  }
  if (!mode) {
    mode = source[0] === '<' ? 'html' : 'javascript'
  }
  const lineCount = source.split('\n').length
  const height = lineCount * 16 + 'px'
  elt.replaceWith(b8rCodeEditor(source, { mode, style: { ...codeStyle, height } }))
}

export const md = async (elt, source, options = { renderTables: false }) => {
  const { showdown } = await viaTag('https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js')

  if (options.renderTables) {
    const { renderTables } = await import('./markdown-tables.js')
    if (options.renderTables) source = renderTables(source)
  }

  var converter = new showdown.Converter()
  elt.innerHTML = converter.makeHtml(source)
  // showdown incorrectly wraps custom-elements in paragraphs
  b8r.findWithin(elt, 'b8r-component').forEach(c => b8r.unwrap(c))
  b8r.findWithin(elt, 'pre').forEach(pre => {
    code(pre)
  })
  b8r.bindAll(elt)
  b8r.trigger('md-render', elt)
}
