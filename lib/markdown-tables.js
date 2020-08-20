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
const source = '# This is a test: \n||foo ||bar \n|17 |23\n  ||another ||table\n  |42 |3.14\n  |**bold**, | _italic_,\n  | and `code` | work'
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

~~~~
const {
  cellContentRenderer,
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
Test(() => cellContentRenderer('this *is a* test')).shouldBe('this <i>is a</i> test')
Test(() => cellContentRenderer('this is a __test__')).shouldBe('this is a <b>test</b>')
Test(() => cellContentRenderer('`this is a` test')).shouldBe('<code>this is a</code> test')
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

## Extended Markdown Syntax (e.g. Github)

Finally, a number of markdown implementations (notably
[Github](https://docs.github.com/en/github/writing-on-github/organizing-information-with-tables))
support tables via extended syntax [slightly different from mine](https://www.markdownguide.org/extended-syntax/).
I've added support for tables in this syntax to a limited degree. All this code does is replace
'|' with '||' in lines followed by a line composed entirely of '|' and '-' characters.

Basically, the other syntax looks like this:

<pre>
&nbsp;| col-1 | col-2 |
&nbsp;|--|--|
&nbsp;| cell-1 | cell-2 |
</pre>

Here's a table in this syntax, rendered using this library:

| My Syntax | Popular Syntax
|--|--
| Less typing | More Typing
| Can have header cells anywhere | Not
| Cannot change text alignment | Can change text alignment
*/

export const cellContentRenderer = text => text
  .replace(/[*_]{2,2}(.*?)[*_]{2,2}/g, '<b>$1</b>')
  .replace(/[*_](.*?)[*_]/g, '<i>$1</i>')
  .replace(/`(.*?)`/g, '<code>$1</code>')
export const renderCell = text => {
  return text.startsWith('||')
    ? `<th>${cellContentRenderer(text.substr(2))}</th>`
    : `<td>${cellContentRenderer(text.substr(1))}</td>`
}
export const renderRow = ({ content }) => {
  const cells = content.match(/\|{1,2}(\\\||[^|])+/g)
  return `<tr>${cells.map(renderCell).join('')}</tr>`
}
export const renderTable = rows => `${rows[0].indent}<table>${rows.map(renderRow).join('')}</table>`
export const renderTables = source => {
  const lines = []
  const rows = []

  // need empty line at end to simplify loop
  const rawLines = source.split('\n')
  rawLines.forEach((line, idx) => {
    // skip heading indicators (they're dealt with already)
    if (line.match(/^([\s>]*)[|-]{4,}\s*$/)) {
      return
    }
    // if we see a |--|--| style heading indicator ahead, 
    // convert this row to heading cells
    if (rawLines[idx + 1] && rawLines[idx + 1].match(/^[|-]{4,}\s*$/)) {
      line = line.replace(/\|\s/g, '|| ')
    }
    const [, indent, content] = [line.match(/^([\s>]*)(\|{1,2}[^|].*)\s*$/)].flat()
    if (rows.length && (indent !== rows[0].indent || !content || !content.trim())) {
      lines.push(renderTable(rows))
      rows.splice(0)
    }
    if (content) {
      rows.push({ indent, content })
    } else {
      lines.push(line)
    }
    return content ? { indent, content } : line
  })
  if (rows.length) lines.push(renderTable(rows))
  return lines.join('\n')
}
