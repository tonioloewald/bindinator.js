/**
# Data Table

Data-table is intended to make quick work of most tables — out of the box it supports fixed headers,
resizable columns, showing/hiding columns. Customizing cells and headers is a matter of providing
replacement elements, and styling is powered by css-variables.

The data-table is highly configurable via its `config` property.

### config

The data-table component's `config` property allows the table to be configured
very flexibly:

    {
      virtual: true,                   // whether to virtualize the list using biggrid
      sliceModulus: false,             // (if virtual) whether to make the slices stable modulo n
      userCanEditColumns: true,        // can user pick which columns are shown?
      maxRowsForLiveColumnResize: 100, // maximum number of rows before columns stop live resizing
      columns: [
        {
          name: 'column name',
          path: '.path.to.value',

          // optional settings (defaults shown)
          visible: true,
          minWidth: 40,       // number of pixels
          width: 80,          // number of pixels
          maxWidth: 400,      // number of pixels
          resizable: true,
          sortable: false     // provide an ascending sort comparison function (a, b) => -1 | 0 | 1
          headerCell: false,  // domElement,
          contentCell: false, // domElement,
        },
        ...
      ]
    }

### Virtual

By default, biggrid will display the table *virtually*, i.e. it will only render a minimum
number of table rows sufficent to fill the provided space. If you want to do something like
scroll to a specific table row using `HTMLElement.scrollIntoView(...)` then you'll want
to turn this off (by setting `virtual: false` in `config` or wait until I've implemented that feature.

As an indication of the size of the performance win you get from virtualizing the table, the
rendering time for this page on my laptop goes down by ~700ms with `virtual: true`.

In the example, the row styles are set to `nth-child(4n+...)` so `sliceModulus: 4` is used to keep
the column-shading stable.

**Note** that although `biggrid` is stipulated only to work with fixed-size elements, it actually works 
just fine with variable height rows in a single-column grid (i.e. a table).

### To Do

- table can have selection: { multiple: true|false, path: 'path.to.prop' }
  (if no path provided, selection is tracked internally)
- column reordering

Selection can be implemented by exporting a custom `column` based on the column
setup in the example.

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
  style="height: 100%;"
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
    sliceModulus: 4,
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
        resizable: false,
        headerCell: selectHeader,
        contentCell: selectCell
      },
      {
        name: 'emoji',
        path: '.chars',
        resizable: false,
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
        sortable: (a, b) => b8r.sortAscending(a.category + ' ' + a.subcategory, b.category + ' ' + b.subcategory),
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
import { slice } from '../lib/biggrid.js'

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

const clamp = (min, x, max) => x < min ? min : (x > max ? max : x)

const columnDefaults = {
  name: '',
  minWidth: 40,
  visible: true,
  width: 80,
  maxWidth: 400,
  resizable: true,
  sortable: false,
  path: '',
  headerCell: false,
  contentCell: false
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

    ._component_ .t-row:nth-child(4n),
    ._component_ .t-row:nth-child(4n+1) {
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
      right: -5px;
      top: 0;
      height: 100vh;
      border-left: 1px solid var(--black-10);
      cursor: col-resize;
      z-index: 2;
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
    }

    ._component_ > .t-visible-columns {
      display: block;
      position: absolute;
      top: 28px;
      right: 5px;
      background: var(--white-75);
      padding: 5px;
    }

    ._component_ > .t-visible-columns:before {
      pointer-events: none;
      content: ' ';
      display: block;
      width: 1px;
      height: 1px;
      border: 10px solid transparent;
      border-bottom-color: var(--white-75);
      position: absolute;
      top: -21px;
      right: 0px;
    }

    ._component_ > .t-visible-columns > label {
      display: block;
      padding: 5px 10px;
    }
    `,
  html: `
    <div class="t-head t-row">
      <span
        tabindex=0
        data-list="_component_.visibleColumns(_component_.config.columns):name"
      >
        <span 
          class="t-column-resizer"
          data-event="mousedown:_component_.resizeColumn"
          data-bind="pointer_events_if=.resizable"
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
        tabindex=0
        title="select visible columns"
        class="t-column-selection icon-eye2 clickable"
        data-bind="show_if=_component_.config.userCanEditColumns"
        data-event="keydown(Space),click:_component_.toggleEditVisibleColumns"
      ></div>
    </div>
    <div 
      class="t-body" 
      data-bind="method(_component_.renderRow)=_component_.config.columns"
    >
      <div
        tabindex=0
        class="t-row" 
        data-list="_component_.sortAndFilterRows(_component_.rows):_auto_"
      >
      </div>
    </div>
    <div 
      class="t-visible-columns"
      data-bind="show_if=_component_.editVisibleColumns"
    >
      <label data-list="_component_.config.columns">
        <input type="checkbox" data-bind="checked=.visible">
        <span data-bind="text=.name"></span>
      </label>
    </div>
    `,
  load: ({ b8r, component }) => {
    b8r.addDataBinding(component, 'method(_component_.renderGrid)', '_component_.config.columns')
  },
  initialValue: ({ b8r, get, set, touch, component, on, findOne, find }) => {
    return {
      visibleColumns (/* ignore */) {
        const columns = get().config.columns
        columns.forEach((column, idx) => {
          columns[idx] = {
            ...columnDefaults,
            ...column
          }
        })
        return columns.filter(({ visible }) => !!visible)
      },
      toggleEditVisibleColumns () {
        const { rows, editVisibleColumns } = get()
        set({ editVisibleColumns: !editVisibleColumns })
        if (editVisibleColumns) {
          // because we're changing the list template (something b8r does not understand)
          // we're going to blow away all the list instances by setting the list to empty
          // and then after b8r cleans everything up, putting them back again
          set({ rows: [] })
          touch('config.columns')
          b8r.afterUpdate(() => {
            set({ rows })
          })
        }
      },
      resizeColumn (evt) {
        const { config: { virtual, maxRowsForLiveColumnResize }, rows} = get()
        const edgeIndex = b8r.elementIndex(evt.target.closest('.t-row > *'))
        const columns = get().visibleColumns()
        if (columns.length < 1) return
        columns.pop()
        const liveResize = virtual || rows.length <= maxRowsForLiveColumnResize
        const thead = findOne('.t-head')
        trackDrag(evt, columns[edgeIndex].width, 0, (w, _y, _dx, _dy, dragEnded) => {
          columns[edgeIndex].width = clamp(columns[edgeIndex].minWidth, w, columns[edgeIndex].maxWidth)
          const gridSpec = columns.map(c => c.width + 'px').join(' ') + ' auto'
          if (liveResize || dragEnded) {
            b8r.cssVar(thead, '--columns', '')
            b8r.cssVar(component, '--columns', gridSpec)
          } else {
            b8r.cssVar(thead, '--columns', gridSpec)
          }
        })
      },
      renderGrid (table, columns) {
        const widths = get().visibleColumns().map(col => col.width + 'px')
        widths[widths.length - 1] = 'auto'
        const gridSpec = widths.join(' ')
        b8r.cssVar(component, '--columns', gridSpec)
      },
      renderRow (tableBody) {
        const rowTemplate = findOne('.t-body > .t-row[data-list]')
        rowTemplate.textContent = ''
        get().visibleColumns().forEach(async ({ path, contentCell }) => {
          rowTemplate.append(contentCell ? contentCell.cloneNode(true) : cell(path))
        })
        b8r.bindAll(rowTemplate)
      },
      replaceElement (element, replacement) {
        /* global HTMLElement */
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
      sortAndFilterRows (rows, listTemplate) {
        const { config: { virtual, sliceModulus, columns } } = get()
        const column = columns.find(col => col.sortDirection)
        const filtered = column ? [...rows].sort(makeSortFunction(column)) : rows
        return virtual ? slice(filtered, listTemplate, true, sliceModulus) : filtered
      },
      editVisibleColumns: false,
      sliceModulus: false,
      config: {
        virtual: true,
        userCanEditColumns: true,
        maxRowsForLiveColumnResize: 100,
        columns: []
      },
      rows: []
    }
  }
}
