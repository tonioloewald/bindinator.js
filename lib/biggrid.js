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
the data attribute `data-biggrid-item-size="width,height"` (on the grid element or any parent)
allows the dimensions to be passed directly.

`biggrid` exports its internal methods (`slice` in particular) so that you can
use them in other filter methods.

Usage:

    slice(list, list_template, singleColumn=false, modulus=false);

`slice` will return a minimal number of elements, and it will insert padding elements above
and below the list to keep the scrolling area size constant and the position of the elements
correct. It will also add `resize` and `scroll` handlers to the container element.

`singleColumn` forces a single column (allowing biggrid to handle big lists -- where each
list item is a fixed height).

`modulus` will constrain the first row of the slice to be a multiple of modulus (and increase
the size of the slice by modulus) to allow stable `nth-child` offsets.

## Scrolling to Index

    scrollToIndex(listTemplate, index, durationMs=1000)

Since scrolling to an element that isn't there is tricky, biggrid provides a function that will
smoothly animate scrolling to a specifed item in the grid.
*/

import b8r from '../source/b8r.js'
import {relayTo} from '../lib/resize.js'

const toInt = x => parseInt(x, 10)

const getDimensions = elt => {
  const eltWithSize = elt.closest('[data-biggrid-item-size]')
  if (eltWithSize) {
    const [width, height] = eltWithSize.dataset.biggridItemSize.split(',').map(toInt)
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
      width: wrapper.offsetWidth || 1,
      height: wrapper.offsetHeight || 1
    }
    wrapper.remove()
    return dimensions
  }
}

const _updaters = []

const update = (_evt, target) => {
  let updater = _updaters.find(u => u.target === target)
  if (!updater) {
    updater = { target, update: b8r.throttleAndDebounce(() => _update(target), 30) }
    _updaters.push(updater)
  }
  updater.update()
  for (let i = _updaters.length - 1; i >= 0; i--) {
    if (!b8r.isInBody(_updaters[i].target)) {
      _updaters.splice(i, 1)
    }
  }
}

const _update = async (target) => {
  target = target.matches('[data-list].biggrid-item')
    ? target
    : target.querySelector('[data-list].biggrid-item')
  b8r.touchElement(target)
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

/*
TODO: turn this into a library with a factory function and easing functions

lerp = (a, b, t, f = x => x) => {
  if (t < 0) {
    return a
  } else if (t > 1) {
    return b
  } else {
    t = f(t)
    return a * (1-t) + b * t
  }
}
// tests
lerp(-1, 1, -1) === -1
&& lerp(-1, 1, 0) === -1
&& lerp(-1, 1, 0.25) === -0.5
&& lerp(-1, 1, 0.9) === 0.8
&& lerp(-1, 1, 2) === 1
*/

const lerp = (a, b, t, f = x => x) => {
  if (t < 0) {
    return a
  } else if (t > 1) {
    return b
  } else {
    t = f(t)
    return a * (1-t) + b * t
  }
}

const scrollToIndex = (target, index, durationMs = 1000) => {
  const slice = slices.find(slice => slice.target === target)
  if(! slice) return
  const {container} = slice
  index = Math.min(index, Math.max(slice.totalRows - slice.visibleRows, 0))
  const finalScrollTop = slice.item.height * Math.floor(index / slice.rowSize)
  if (durationMs === 0) {
    container.scrollTop = finalScrollTop
  } else {
    const startingScrollTop = container.scrollTop
    const endTime = Date.now() + durationMs
    const animateScroll = () => {
      const now = Date.now()
      if (now > endTime) {
        container.scrollTop = finalScrollTop
      } else {
        const t = 1 - (endTime - now) / durationMs
        container.scrollTop = lerp(startingScrollTop, finalScrollTop, t)
        requestAnimationFrame(animateScroll)
      }
    }
    requestAnimationFrame(animateScroll)
  }
}

const slice = (list, target, singleColumn = false, modulus = false) => {
  // TODO preserve scroll position after resize event
  const container = target.closest('.biggrid-container') || target.parentElement
  let slice = slices.find(slice => slice.target === target)
  if (!slice) {
    slice = { target, item: getDimensions(target) }
    slices.push(slice)
    target.classList.add('biggrid-item')
    b8r.on(container, ['scroll', 'resize'], 'biggrid.update')
    relayTo(container)
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
    slice.totalRows = list.length
    slice.firstRow = Math.min(
      slice.rows - slice.visibleRows,
      Math.floor(Math.max(container.scrollTop, 0) / slice.item.height)
    )
    if (modulus) {
      const offset = slice.firstRow % modulus
      slice.firstRow -= offset
      slice.visibleRows += offset
    }
    slice.trailingRows = slice.rows - slice.visibleRows - slice.firstRow
    slice.container = container
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
  scrollToIndex,
  getDimensions
}
