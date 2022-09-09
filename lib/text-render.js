/**
# text-render

Utilities for rendering text.

## Code

    render.code({elt, source = false, mode = 'javascript', readonly = false}); // elt now contains source, loaded into ace-editor

If `source` is omitted, the element's existing `textContent` is rendered.

`mode` to be used by Ace editor. If is omitted, `code` will attempt to guess the correct 'javascript' or 'html'.

For example:

    render.code({elt, source, mode: 'javascript'});

## Markdown

    render.md({elt, source}) -> source in markdown rendered as html by showdown.js

After markdown is rendered a custom event `md-render` is triggered on the container element.

### Tables

    render.md({elt, source, renderTables: true})

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
export const code = ({ elt, source, mode, readOnly }) => {
  if (!source) {
    source = elt.textContent
  }
  if (!mode) {
    mode = source[0] === '<' ? 'html' : 'javascript'
  }
  const lineCount = source.trim('\n').split('\n').length
  const height = lineCount * 16 + 'px'
  const style = readOnly ? { height } : { ...codeStyle, height }
  elt.replaceWith(b8rCodeEditor(source, { mode, style, disabled: readOnly }))
}

export const md = async ({ elt, source, renderTables = false }) => {
  const { showdown } = await viaTag('https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js')

  if (renderTables) {
    const { renderTables } = await import('./markdown-tables.js')
    source = renderTables(source)
  }

  var converter = new showdown.Converter()
  elt.innerHTML = converter.makeHtml(source)
  // showdown incorrectly wraps custom-elements in paragraphs
  b8r.findWithin(elt, 'b8r-component').forEach(c => b8r.unwrap(c))
  b8r.findWithin(elt, 'pre').forEach(pre => {
    code({ elt: pre, readOnly: true })
  })
  b8r.bindAll(elt)
  b8r.trigger('md-render', elt)
}
