/**
# Data Table

Data-table is intended to make quick work of simple tables.

The data-table is highly configurable via its `config` property.

### config

The data-table component's config property allows the table to be configured
very flexibly:

    {
      columns: [
        {
          name: 'column name',
          path: '.path.to.value',
          width: 60, // number of pixels
          sortable: (a, b) => ..., // ascending sort comparison
          headerCell: domElement,
          contentCell: domElement, 
        },
      ]
    }

### To Do

- show/hide columns UI (showing/hiding columns is already supported programmatically)
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
  const selectHeader = b8r.create('input')
  selectHeader.setAttribute('type', 'checkbox')
  selectHeader.dataset.event = 'change:_component_.config.updateSelectAll'
  const selectCell = b8r.create('span')
  const selectCellInput = b8r.create('input')
  selectCellInput.setAttribute('type', 'checkbox')
  selectCellInput.dataset.bind = 'checked=.selected'
  selectCellInput.dataset.event = 'change:_component_.config.updateSelectAll'
  selectCell.append(selectCellInput)
  const emojiCell = b8r.create('span')
  emojiCell.dataset.bind = 'text=.chars'
  b8r.styles(emojiCell, {
    textAlign: 'center',
    fontSize: '20px'
  })
  set('config', {
    updateSelectAll(evt, target) {
      const {checked} = target
      const componentId = b8r.getComponentId(target)
      const rows = b8r.get(`${componentId}.rows`) || []
      if (target.closest('.t-head')) {
        if (checked !== null) {
          rows.forEach(row => row.selected = target.checked)
        }
        b8r.touch(`${componentId}.rows`)
      } else {
        let selectAll = false
        if (rows.length) {
          selectAll = rows[0].selected
          for(let i = 1; i < rows.length; i++) {
            if (rows[i].selected !== selectAll) {
              selectAll = null
              break
            }
          }
          selectHeader.indeterminate = (selectAll === null)
          selectHeader.checked = selectAll
        }
      }
    },
    columns: [
      {
        name: 'selected',
        path: '.selected',
        width: 40,
        headerCell: selectHeader,
        contentCell: selectCell
      },
      {
        name: 'emoji',
        path: '.chars',
        width: 65,
        contentCell: emojiCell,
      },
      {
        name: 'code',
        path: '.code',
        width: 100,
      },
      {
        name: 'name',
        path: '.name',
        sortable: (a, b) => b8r.sortAscending(a.name, b.name),
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
        path: '.subcategory',
        sortable: (a, b) => b8r.sortAscending(a.subcategory, b.subcategory),
        visible: false,
        width: 120,
      },
    ]
  })
  set({loading: true})
  b8r.json('https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json').then(emoji => {
    emoji.forEach(e => e.selected = false)
    set({emoji})
    set('loading', false)
  })
</script>
```
*/

import { trackDrag } from '../lib/track-drag.js'

const makeSortFunction = column => {
  const { sortable, sortDirection } = column
  if (sortDirection === 'ascending') {
    return (a, b) => sortable(a, b)
  } else {
    return (a, b) => -sortable(a, b)
  }
}

const cell = path => {
  const span = document.createElement('span')
  span.dataset.bind = `text=${path}`
  return span
}

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
      position: relative;
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

    ._component_ .t-head > *:hover,
    ._component_ .t-head > *:focus {
      background: var(--black-10);
    }

    ._component_ .t-column-resizer {
      content: ' ';
      position: absolute;
      display: block;
      width: 5px;
      left: 0;
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
      margin-left: -5px;
      text-align: center;
    }

    ._component_ :not(.t-head).t-row:hover,
    ._component_ :not(.t-head).t-row:focus {
      background: var(--black-10);
    }

    ._component_ > .t-head .clickable {
      color: var(--black-80);
      opacity: 0.25;
      transition: var(--hover-transition);
      background: none;
      cursor: pointer;
    }

    ._component_ > .t-head .clickable:hover,
    ._component_ > .t-head .clickable:focus {
      opacity: 0.5;
    }

    ._component_ > .t-head .clickable:active,
    ._component_ > .t-head .t-column-sorter:not(.icon-sort) {
      opacity: 1;
    }

    ._component_ > .t-head .t-column-selection {
      position: absolute;
      top: 0;
      right: 0;
      padding: 8px;
    }`,
  html: `
    <div class="t-head t-row">
      <span
        tabindex=0
        data-list="_component_.visibleColumns(_component_.config.columns):name"
      >
        <span 
          class="t-column-resizer"
          data-event="mousedown:_component_.resizeColumn"
        ></span>
        <span
          title="sort"
          tabindex=0
          class="t-column-sorter clickable"
          data-bind="
            show_if=.sortable
            class_map(ascending:icon-sort-ascending|descending:icon-sort-descending|icon-sort)=.sortDirection
          "
          data-event="keydown(Space),mousedown:_component_.sortColumn"
        ></span>
        <span 
          class="t-column-name"
          data-bind="
            text=.name
            method(_component_.replaceElement)=.headerCell
          "
        ></span>
      </span>
      <div 
        title="select visible columns"
        tabindex=0 class="t-column-selection icon-eye2 clickable"
      ></div>
    </div>
    <div 
      class="t-body" 
      data-bind="method(_component_.renderRow)=."
    >
      <div
        tabindex=0
        class="t-row" 
        data-list="_component_.sortAndFilterRows(_component_.rows):_auto_"
      >
      </div>
    </div>`,
  load: ({ b8r, component }) => {
    b8r.addDataBinding(component, 'method(_component_.renderGrid)', '_component_.config.columns')
  },
  initialValue: ({ b8r, get, touch, component, on, findOne }) => {
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
        const gridSpec = widths.join(' ')
        b8r.cssVar(component, '--columns', gridSpec)
      },
      renderRow (tableBody, rowData) {
        const { config, visibleColumns } = get()
        const rowTemplate = tableBody.querySelector('[data-list]')
        rowTemplate.textContent = ''

        if (config.columns) {
          visibleColumns(config.columns)
            .forEach(async ({ path, contentCell }) => {
              rowTemplate.append(contentCell ? contentCell.cloneNode(true) : cell(path))
            })
        }
        b8r.bindAll(rowTemplate)
      },
      replaceElement (element, replacement) {
        if (replacement instanceof HTMLElement) {
          element.parentElement.replaceChild(replacement, element)
        }
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
