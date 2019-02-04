/**
# biggrid.js

Controller for sparse grids of fixed-size elements

Usage:

    <div style="overflow-y: scroll">
      <div data-list="path.to.list.id">
        ...
      </div>
    </div>

becomes:

    <div style="overflow-y: scroll">
      <div data-list="biggrid.slice(path.to.list).id">
        ...
      </div>
    </div>
    <script type="module">
      await import('path/to/biggrid.js');
    </script>

`biggrid` will assume the item's `parentElement` is the outer (clipping) scroll view and
use its dimensions to determine how much stuff to how. To override this with a different
ancestor, use the class `biggrid-container`.

To account for padding etc. you can use the data attribute `data-biggrid-padding="width,height"`
to reduce the container's dimensions for purposes of scrolling calculations.

`biggrid` will try to calculate the dimensions of the grid item automatically,
but it may fail if (for example) the item has margins or is loaded asynchronously, in which case
the data attribute `data-biggrid-item-size="width,height"` allows the dimensions to be passed
directly.

Finally, biggrid exports its internal methods (`slice` in particular) so that you can
use them in other filter methods.

Usage:

    slice(list, list_template, singleColumn=false);

`slice` will return a minimal number of elements, and it will insert padding elements above
and below the list to keep the scrolling area size constant and the position of the elements
correct. It will also add `resize` and `scroll` handlers to the container element.

`singleColumn` forces a single column (allowing biggrid to handle big lists -- where each
list item is a fixed height).
*/

import b8r from '../source/b8r.js'

const toInt = x => parseInt(x, 10)

const getDimensions = elt => {
  if (elt.dataset.biggridItemSize) {
    const [width, height] = elt.dataset.biggridItemSize.split(',').map(toInt)
    return { width, height }
  } else {
    elt = elt.cloneNode(true)
    delete elt.dataset.list
    elt.style.display = ''

    const wrapper = b8r.create('div')
    wrapper.style.padding = 0
    wrapper.style.position = 'absolute'
    wrapper.style.bottom = '-200%'
    wrapper.style.left = 0
    wrapper.appendChild(elt)

    document.body.appendChild(wrapper)
    const dimensions = {
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight
    }
    wrapper.remove()
    return dimensions
  }
}

const update = (evt, target) => {
  target = target.matches('[data-list].biggrid-item')
    ? target
    : target.querySelector('[data-list].biggrid-item')
  b8r.bindAll(target)
}

const _spacer = (target, type) => {
  let spacer = target.querySelector(`.biggrid-${type}-spacer`)
  if (!spacer) {
    spacer = b8r.create('div')
    spacer.classList.add(`biggrid-${type}-spacer`)
    spacer.style.width = '100%'
    if (type === 'top') {
      target.insertBefore(spacer, target.firstChild)
    } else {
      target.appendChild(spacer)
    }
  }
  return spacer
}

const slices = [] // memoized responses {target, rowSize, rows, visibleRows, firstRow}

const slice = (list, target, singleColumn = false) => {
  // TODO preserve scroll position after resize event
  const container = target.closest('.biggrid-container') || target.parentElement
  let slice = slices.find(slice => slice.target === target)
  if (!slice) {
    slice = { target, item: getDimensions(target) }
    slices.push(slice)
    target.classList.add('biggrid-item')
    b8r.on(container, ['scroll', 'resize'], 'biggrid.update')
  }
  let useExistingSlice = false

  const topSpacer = _spacer(container, 'top')
  const bottomSpacer = _spacer(container, 'bottom')

  if (!list || !list.length || !b8r.isVisible(container, true)) {
    b8r.hide(topSpacer)
    b8r.hide(bottomSpacer)
    useExistingSlice = true
  }

  const [padWidth, padHeight] = (container.dataset.biggridPadding || '0,0').split(',').map(toInt)
  const h = container.clientHeight - padHeight
  const w = container.clientWidth - padWidth

  if (h <= slice.item.height && w <= slice.item.width) {
    // console.warn('biggrid -- insufficient room to display any items', target);
    useExistingSlice = true
  }

  if (!useExistingSlice) {
    slice.rowSize = singleColumn ? 1 : Math.max(1, Math.floor(w / slice.item.width))
    slice.rows = Math.ceil(list.length / slice.rowSize)
    slice.visibleRows = Math.min(Math.ceil(h / slice.item.height + 1), slice.rows)
    slice.firstRow = Math.min(
      slice.rows - slice.visibleRows,
      Math.floor(Math.max(container.scrollTop, 0) / slice.item.height)
    )
    slice.trailingRows = slice.rows - slice.visibleRows - slice.firstRow
  }

  b8r.show(topSpacer)
  b8r.show(bottomSpacer)
  topSpacer.style.height = (slice.firstRow * slice.item.height) + 'px'
  bottomSpacer.style.height = (slice.trailingRows * slice.item.height) + 'px'

  return list.slice(
    slice.firstRow * slice.rowSize,
    (slice.firstRow + slice.visibleRows) * slice.rowSize
  )
}

const biggrid = {
  update,
  slice
}

b8r.register('biggrid', biggrid)

export {
  biggrid,
  update,
  slice,
  getDimensions
}
