/**
# markdown tables

Markdown has been sorely missing table support for a long time. This is a pretty
simple implementation.

A line beginning with a `|` is a table row. The initial `|` is also considered part of
the content of the row. Within a row:
- `||` foo — adds `<th>foo</th>` to the row
- `|` bar — adds `<td>bar</td>` to the row
- escape `|` with `\`
- leading white space and `>` for each line are just treated as `indentation`
- a table ends when the _exact_ indentation changes or there's a non-table line

A table is inferred from a series of table rows with the same indent and no empty lines
separating sequential rows.

```
const {renderTables} = await import('../lib/markdown-tables.js')
const source = '# This is a test: \n||foo ||bar \n|17 |23\n  ||another ||table\n  |42 |3.14'
const rendered = renderTables(source)
example.innerHTML = rendered
const pre = b8r.create('pre')
pre.innerText = rendered
example.append(pre)
```

Since markdown allows inline HTML, conceptually you can replace:

    element.innerHTML = renderMarkdown(source)

with:

    element.innerHTML = renderMarkdown(renderTables(source))

And it should "just work"!

So, putting it all together, here's a simple markdown editor (with renderTables wired in)

<b8r-component path="./components/markdown-editor">
# Below should be a table
</b8r-component>

~~~~
const {
  renderCell,
  renderRow,
  renderTable,
  renderTables
} = await import('../lib/markdown-tables.js')
const source = [
  '# This is a test:',
  '||foo ||bar \n|17 |23',
  '  ||another ||table\n  |42 |3.14'
]
const output = [
  '# This is a test:',
  '<table><tr><th>foo </th><th>bar </th></tr><tr><td>17 </td><td>23</td></tr></table>',
  '  <table><tr><th>another </th><th>table</th></tr><tr><td>42 </td><td>3.14</td></tr></table>'
]
const wrap = (source, selector) => {
  const div = document.createElement('div')
  div.innerHTML = source
  return div.querySelector(selector)
}
Test(() => renderCell('|foo')).shouldBe('<td>foo</td>')
Test(() => renderCell('||bar')).shouldBe('<th>bar</th>')
Test(() => renderRow({ content: '|foo ||bar' })).shouldBe('<tr><td>foo </td><th>bar</th></tr>')
Test(() => renderTable([{indent: '> ', content: '||foo ||bar'},{indent: '> ', content: '|17 |42'}]))
  .shouldBe('> <table><tr><th>foo </th><th>bar</th></tr><tr><td>17 </td><td>42</td></tr></table>')
for(let i in source) {
  Test(() => renderTables(source[i]), `render ${source[i]}`).shouldBe(output[i])
}
Test(() => renderTables(source.join('\n')), 'mixed source').shouldBe(output.join('\n'))
~~~~
*/

export const renderCell = text => text.startsWith('||') ? `<th>${text.substr(2)}</th>` : `<td>${text.substr(1)}</td>`
export const renderRow = ({ content }) => {
  const cells = content.match(/\|{1,2}(\\\||[^|])+/g)
  return `<tr>${cells.map(renderCell).join('')}</tr>`
}
export const renderTable = rows => `${rows[0].indent}<table>${rows.map(renderRow).join('')}</table>`
export const renderTables = source => {
  const lines = []
  const rows = []
  // need empty line at end to simplify loop
  source.split('\n').forEach(line => {
    const [, indent, content] = [line.match(/^([\s>]*)(\|{1,2}[^|].*)$/)].flat()
    if (rows.length && (indent !== rows[0].indent || !content || !content.trim())) {
      lines.push(renderTable(rows))
      rows.splice(0)
    }
    if (content) {
      rows.push({ indent, content })
    } else {
      console.log(line)
      lines.push(line)
    }
    return content ? { indent, content } : line
  })
  if (rows.length) lines.push(renderTable(rows))
  return lines.join('\n')
}