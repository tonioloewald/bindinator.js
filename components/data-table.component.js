/**
# Data Table

Data-table is intended to make quick work of simple tables.

The data-table is highly configurable via its `config` property.

### To Do

- show/hide columns UI (showing/hiding columns is already supported programmatically)
- columns can specify custom headerCell component path or renderer (function)
- columns can specify custom contentCell component path or renderer (function)
- columns can be `sortable: true` or `sortable: (a, b) => -1 | 0 | 1`
- table can have selection: { multiple: true|false, path: 'path.to.prop' } (if no path provided, selection is tracked internally)
- virtual table (minimum number of elements in DOM)
- state persistence to localStorage / services

```
<style>
  ._component_ .loading-component {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateX(-50%) translateY(-50%);
  }
</style>
<b8r-component
  path="../components/data-table.component.js"
  data-bind="
    component(rows)=_component_.emoji
    component(config)=_component_.config
  "
>
</b8r-component>
<b8r-component path="../components/loading" data-bind="show_if=_component_.loading"></b8r-component>
<script>
  set('config', {
    columns: [
      {
        name: 'emoji',
        path: '.chars',
        width: 65,
      },
      {
        name: 'code',
        path: '.code',
        width: 100,
      },
      {
        name: 'name',
        path: '.name',
        sortable: true,
        width: 200,
      },
      {
        name: 'category',
        path: '.category',
        visible: false,
        width: 120,
      },
      {
        name: 'sub-category',
        path: '.subcatory',
        sortable: true,
        visible: false,
        width: 120,
      },
    ]
  })
  set({loading: true})
  b8r.json('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json').then(emoji => {
    set({emoji})
    set('loading', false)
  })
</script>
```
*/

import { trackDrag } from '../lib/track-drag.js'

export default {
  css: `
    ._component_ {
      --table-height: 400px;
      --table-width: 100%;
      --columns: 40px 80px 120px 160px 200px auto;
      --table-head-font: bold 14px sans-serif;
      --table-body-font: 14px sans-serif;
      width: var(--table-width);
      height: var(--table-height);
      display: flex;
      flex-direction: column;
      cursor: default;
    }

    ._component_ .t-head {
      flex: 0 0 auto;
      background: var(--black-10);
      font: var(--table-head-font);
    }

    ._component_ .t-body {
      flex: 1 1;
      overflow-y: scroll;
      overflow-y: overlay;
      font: var(--table-body-font);
    }

    ._component_ .t-row {
      display: grid;
      grid-template-columns: var(--columns);
      vertical-align: middle;
      line-height: 20px;
    }

    ._component_ .t-row:nth-child(4n+3),
    ._component_ .t-row:nth-child(4n) {
      background: var(--black-5);
    }

    ._component_ .t-row > * {
      padding: 2px 10px;
    }

    ._component_ .t-head > * {
      padding: 5px 10px;
      position: relative;
    }

    ._component_ .t-column-resizer {
      content: ' ';
      position: absolute;
      display: block;
      width: 5px;
      left: -5px;
      top: 0;
      height: 100vh;
      border-left: 1px solid var(--black-10);
      cursor: col-resize;
    }

    ._component_ .t-column-resizer:hover,
    ._component_ .t-column-resizer:active {
      border-left: 1px solid var(--black-20);
    }

    ._component_ .t-column-sorter {
      margin-left: -10px;
      text-align: center;
      cursor: pointer;
      color: var(--black-80);
      opacity: 0.25;
      transition: 0.1s ease-out;
    }

    ._component_ .t-column-sorter:hover {
      opacity: 0.5;
    }

    ._component_ .t-column-sorter:not(.icon-sort) {
      opacity: 1;
    }

    ._component_ :not(.t-head).t-row:hover {
      background: var(--black-10);
    }`,
  html: `
    <div class="t-head t-row">
      <span 
        data-list="_component_.visibleColumns(_component_.config.columns):name"
      >
        <span 
          class="t-column-resizer"
          data-event="mousedown:_component_.resizeColumn"
        ></span>
        <span
          class="t-column-sorter icon-sort-ascending"
          data-bind="
            show_if=.sortable
            class_map(ascending:icon-sort-ascending|descending:icon-sort-descending|icon-sort)=.sortDirection
          "
          data-event="mousedown:_component_.sortColumn"
        ></span>
        <span data-bind="text=.name"></span>
      </span>
    </div>
    <div 
      class="t-body" 
      data-bind="method(_component_.renderRow)=."
    >
      <div 
        class="t-row" 
        data-list="_component_.sortAndFilterRows(_component_.rows):_auto_"
      >
      </div>
    </div>`,
  load: ({ b8r, component }) => {
    b8r.addDataBinding(component, 'method(_component_.renderGrid)', '_component_.config.columns')
  },
  initialValue: ({ b8r, get, touch, component, on, findOne }) => {
    const makeSortFunction = column => {
      const { name, sortDirection } = column
      let { sortable } = column
      if (!sortable) throw new Error(`cannot sort by column ${name}`)
      if (sortable === true) sortable = b8r.sortAscending
      if (sortDirection === 'ascending') {
        return (a, b) => sortable(a[name], b[name])
      } else {
        return (a, b) => -sortable(a[name], b[name])
      }
    }
    return {
      visibleColumns (columns) {
        return columns.filter(({ visible }) => visible !== false)
      },
      resizeColumn (evt) {
        const edgeIndex = b8r.elementIndex(evt.target.closest('.t-row > *')) - 1
        const columns = b8r.cssVar(component, '--columns').split(' ')
        columns.pop()
        const liveResize = get('rows').length <= get('config.maxRowsForLiveColumnResize')
        const widths = columns.map(x => parseInt(x, 10))
        const thead = findOne('.t-head')
        trackDrag(evt, widths[edgeIndex], 0, (w, _y, _dx, _dy, dragEnded) => {
          widths[edgeIndex] = w < 20 ? 20 : w
          const gridSpec = widths.map(w => w + 'px').join(' ') + ' auto'
          if (liveResize || dragEnded) {
            b8r.cssVar(thead, '--columns', '')
            b8r.cssVar(component, '--columns', gridSpec)
          } else {
            b8r.cssVar(thead, '--columns', gridSpec)
          }
        })
      },
      renderGrid (table, columns) {
        const widths = get('visibleColumns')(columns).map(col => col.width + 'px')
        widths[widths.length - 1] = 'auto'
        b8r.cssVar(table, '--columns', widths.join(' '))
      },
      renderRow (tableBody, rowData) {
        const { config, visibleColumns } = get()
        const rowTemplate = tableBody.querySelector('[data-list]')
        rowTemplate.textContent = ''

        if (config.columns) {
          visibleColumns(config.columns)
            .forEach(async ({ path }) => {
              const span = b8r.create('span')
              span.dataset.bind = `text=${path}`
              rowTemplate.appendChild(span)
            })
        }
        b8r.bindAll(rowTemplate)
      },
      sortColumn (evt) {
        const { name } = b8r.getListInstance(evt.target)
        const { config: { columns } } = get()
        columns.forEach(column => {
          if (column.name === name) {
            switch (column.sortDirection) {
              case 'ascending':
                column.sortDirection = 'descending'
                break
              case 'descending':
                delete (column.sortDirection)
                break
              default:
                column.sortDirection = 'ascending'
            }
          } else {
            delete (column.sortDirection)
          }
        })
        touch('config')
      },
      sortAndFilterRows (rows) {
        const { config: { columns } } = get()
        const column = columns.find(col => col.sortDirection)
        if (column) {
          return [...rows].sort(makeSortFunction(column))
        } else {
          return rows
        }
      },
      config: {
        maxRowsForLiveColumnResize: 100,
        columns: []
      },
      rows: []
    }
  }
}
