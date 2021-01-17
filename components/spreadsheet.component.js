/**
# spreadsheet

**WIP**

Implements a basic, virtualized spreadsheet, including handling of a sparse grid of data.

```
<b8r-component path="../components/spreadsheet.component.js"></b8r-component>
```
*/

const alphabet = 'abcdefghijklmnopqrstuvwxyz'
const alphaBase = (n) => {
  let s = ''
  const base = alphabet.length
  do {
    s = alphabet[n % base] + s
    n = Math.floor(n / base)
  } while (n > 0)
  return s
}

const makeSheet = (cols, rows) => new SpreadSheet(cols, rows)

class SpreadSheet {
  constructor (colCount, rowCount) {
    const rows = []
    const columns = []
    for (let row = 0; row < rowCount; row++) {
      const cells = []
      cells[colCount - 1] = null
      rows.push({
        name: row + 1,
        cells
      })
    }
    for (let col = 0; col < colCount; col++) {
      columns.push({
        title: alphaBase(col),
        width: 100
      })
    }
    Object.assign(this, {
      columns,
      rows,
      colCount,
      rowCount
    })
  }

  setCell (col, row, value) {
    const type = !isNaN(parseFloat(value)) ? 'number' : (value[0] === '=' ? 'formula' : 'text')
    console.log({ col, row, value, type })
    this.rows[row].cells[col] = { value, type }
  }

  getCell (col, row) {
    return (this.rows[row].cells[col] || {}).value
  }
}

export default {
  css: `
._component_ {
  border: 1px solid var(--black-10);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 400px;
  box-sizing: border-box;
  overflow: hidden;
}
.header {
  display: grid;
  grid-template-columns: var(--columns);
  background: var(--bright-accent-color);
  flex-shrink: 0;
  position: absolute;
  padding-left: 60px;
  height: 24px;
  white-space: nowrap;
}
.grid {
  padding: 24px 0 0 60px;
  width: 100%;
  height: 100%;
  position: absolute;
  flex: 1 1 auto;
  overflow: auto;
  overflow: overlay;
}
.row-header {
  padding-top: 24px;
  display: flex;
  background: var(--bright-accent-color); 
  flex-direction: column;
  position: absolute;
}
.row-header > .cell {
  widtH: 60px;
}
.row {
  display: grid;
  grid-template-columns: var(--columns);
  white-space: nowrap;
  height: 24px;
}
.cell {
  display: inline-block;
  height: 24px;
  line-height: 24px;
  padding: 0 4px;
  text-align: right;
  border: 1px solid var(--black-10);
  vertical-align: bottom;
}
.header span {
  text-transform: Uppercase;
  text-align: center;
  font-weight: bold;
  grid-template-columns: var(--columns);
}

.top-left {
  position: absolute;
  background: var(--bright-accent-color);
  height: 24px;
  width: 60px;
}

.cell[type=number] {
  text-align: right;
}

.cell[type=text] {
  text-align: left;
}

.cell[type=formula] {
  background: var(--white-25);
  text-align: left;
}
`,
  html: `
  <div class="grid" data-event="scroll:_component_.scrollSync" data-bind="_component_.cssGrid=_component_.sheet.columns">
    <div class="row" data-list="_component_.sheet.rows:name">
      <span class="cell" data-list=".cells" data-bind="text=.value;attr(type)=.type">
      </span>
    </div>
  </div>
  <div class="row-header">
    <span class="cell" data-list="_component_.sheet.rows" data-bind="text=.name"></span>
  </div>
  <div class="header">
    <span class="cell" data-list="_component_.sheet.columns" data-bind="text=.title">
    </span>
  </div>
  <div class="top-left"></div>
  `,
  initialValue: ({ b8r, findOne }) => {
    const colHead = findOne('.header')
    const rowHead = findOne('.row-header')
    const grid = findOne('.grid')
    let finalUpdate = 0
    const scrollSync = () => {
      clearTimeout(finalUpdate)
      finalUpdate = setTimeout(scrollSync, 100)
      colHead.style.transform = `translateX(-${grid.scrollLeft}px)`
      rowHead.style.transform = `translateY(-${grid.scrollTop}px)`
    }
    const cssGrid = function (gridElt, columns) {
      b8r.cssVar(gridElt.parentElement, '--columns', (columns || []).map(({ width }) => `${width}px`).join(' '))
    }
    const sheet = makeSheet(50, 100)
    sheet.setCell(2, 2, 1)
    sheet.setCell(2, 3, 2)
    sheet.setCell(2, 4, '= C1 + C2')
    sheet.setCell(0, 0, 'hello world')
    sheet.columns[1].width = 50
    return {
      sheet,
      scrollSync,
      cssGrid
    }
  }
}
