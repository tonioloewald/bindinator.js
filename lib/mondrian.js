/**
# Mondrian

Mondrian is a tool for automatically laying out rectangular elements within their shared parent
element with no gaps, with as "fair" a disbribution of space as possible.

Usage:

    mondrian.arrange(
      elementsArray, {
        parent=null, // defaults to elements[0].parentElement
        aspectRatio=1,
        letterbox=false, // if false, always "cover", otherwise max allowed distortion
        left=0, top=0, width=100, height=100, // portion of parent rect to allocate in %
      }
    );

To allow elements to be "focused" you can use:

    mondrian.arrangeWithFocus(
      elementsArray, {
        parent=null, // defaults to elements[0].parentElement
        aspectRatio=1,
        focusBias=80,
        letterbox=false, // if no element is focused
        letterboxFocus=1.1, // for focused element
        letterboxBlurred=2, // for unfocused elements
      }
    );

**Note**: you need to pass an empty object as the second parameter even if you
like all the defaults. Sorry!

In the latter case, the first (which should be the only) element with the class
`mondrian-focus` will be given `focusBias`% of the available space (the top or left
depending on what better matches its aspect ratio) and the remaining elements
will be arranged as nicely as possible in the remaining 20%.

**elementsArray** is a list of elements that will be arranged within their
current parent element.

Each element will be given a top, left, width, and height in **percentages** so that
the positions will be maintained automatically if the parent is resized.

An element's desired aspect ratio will be calculated based on its native width/height if the
element (or one of its children) is an `img`, `canvas`, or `video` that is not hidden
via `display: none` and does not have the class `mondrian-ignore`.

**aspectRatio** is the desired width / height of the child elements. By default
this is 1.

**letterbox** values dictate whether mondrian will attempt to "letterbox"
a given element because it will be too distorted/cropped otherwise. If the element's
slot's aspect ratio is more than this proportion away from ideal, it will be letterboxed.
If the threshold is `false` it will never be letterboxed.

**left**, **top**, **width**, and **height** represent the portion of the parent rectangle
which will be used by the arrangement.

**focusBias** is the amount of space (as a percentage) devoted to the focused element.

No styling is applied to the elements in question, but the elements should be
`position: absolute;` and the parent should be `position: absolute|relative|fixed`.
If you add `transition: 0.25s ease-out` (say) then elements will transition between layouts.

Mondrian doesn't try to handle resize events, etc. If you want to update the
layout after resizing, adding, or subtracting elements simply call `arrange()` again.
*/
/* global HTMLCanvasElement, HTMLImageElement, HTMLVideoElement, getComputedStyle */
'use strict'

const distortion = a => (a > 1) ? a : (1 / (a || 0.001))
const sizeTargetSelector = ['video', 'img', 'canvas']
  .map(s => s + ':not(.mondrian-ignore)')
  .join()
const elementAspectRatio = element => {
  if (!element.matches(sizeTargetSelector)) {
    element = [...element.querySelectorAll(sizeTargetSelector)]
      .find(elt => getComputedStyle(elt).display !== 'none') ||
                element
  }
  let w, h
  if (element instanceof HTMLCanvasElement) {
    w = element.width
    h = element.height
  } else if (element instanceof HTMLImageElement) {
    w = element.naturalWidth
    h = element.naturalHeight
  } else if (element instanceof HTMLVideoElement) {
    w = element.videoWidth
    h = element.videoHeight
  } else {
    w = element.offsetWidth
    h = element.offsetHeight
  }
  return h ? w / h : 1
}

// rect, if provided, has top/left in percentages and width/height in pixels (or proportions)
function arrange (elements, {
  aspectRatio = 1,
  letterbox = false,
  parent = null,
  left = 0,
  top = 0,
  width = 100,
  height = 100
}) {
  const itemCount = elements.length
  if (elements.length === 0) {
    return
  }

  parent = parent || elements[0].parentElement
  const rect = parent.getBoundingClientRect()
  const containerAspectRatio = rect.width * width / (rect.height * height)
  const targetAspectRatio = aspectRatio / containerAspectRatio

  var rowCount = 1
  var colCount = 1
  const rows = [[]]
  while (rowCount * colCount < itemCount) {
    // aspect ratio adjustment
    var distortionWithNewRow = distortion((rowCount + 1) / colCount / targetAspectRatio)
    var distortionWithNewCol = distortion(rowCount / (colCount + 1) / targetAspectRatio)

    if (distortionWithNewRow < distortionWithNewCol) {
      rowCount += 1
      rows.push([])
    } else {
      colCount += 1
    }
  }

  const aveItemsPerRow = itemCount / rowCount
  for (var i = 0; i < itemCount; i++) {
    var row = Math.floor(i / aveItemsPerRow)
    rows[row].push(elements[i])
  }

  const rowHeight = height / rows.length
  rows.forEach((row, rowIndex) => {
    let cellLeft = left
    row.forEach(elt => {
      const cellWidth = width / row.length
      const cellAspectRatio = containerAspectRatio / row.length * rows.length
      const targetAspectRatio = elementAspectRatio(elt)
      elt.dataset.mondrianTargetAspectRatio = targetAspectRatio
      const _distortion = distortion(cellAspectRatio / targetAspectRatio)
      const css = {
        width: cellWidth.toFixed(2) + '%',
        height: rowHeight.toFixed(2) + '%',
        left: cellLeft.toFixed(2) + '%',
        top: (top + rowHeight * rowIndex).toFixed(2) + '%'
      }

      if (
        !elt.classList.contains('mondrian-do-not-letterbox') &&
        letterbox && _distortion > letterbox
      ) {
        if (cellAspectRatio < targetAspectRatio) {
          // target is wider than the cell, so shrink it and push it down
          css.height = (rowHeight / _distortion).toFixed(2) + '%'
          css.top = (top + rowHeight * rowIndex + (rowHeight - rowHeight / _distortion) * 0.5)
            .toFixed(2) + '%'
        } else {
          // target is taller than the cell, so shrink it and push it right
          css.width = (cellWidth / _distortion).toFixed(2) + '%'
          css.left = (cellLeft + (cellWidth - cellWidth / _distortion) * 0.5).toFixed(2) + '%'
        }
      }
      Object.assign(elt.style, css)
      cellLeft += cellWidth
    })
  })
}

function arrangeWithFocus (elements, {
  parent = null,
  aspectRatio = 1,
  focusBias = 80,
  letterbox = false,
  letterboxFocus = 1.1,
  letterboxBlurred = 2
}) {
  const focusIdx = elements.findIndex(elt => elt.classList.contains('mondrian-focus'))
  elements.forEach(elt => elt.classList.remove('mondrian-blurred'))

  if (elements.length > 1 && focusIdx > -1) {
    parent = parent || elements[0].parentElement
    const rect = parent.getBoundingClientRect()
    const containerAspectRatio = rect.width / (rect.height + 0.001)
    const focusElt = elements[focusIdx]
    elements.splice(focusIdx, 1)
    elements.forEach(elt => elt.classList.add('mondrian-blurred'))
    focusElt.style.top = focusElt.style.left = 0
    const focusAspectRatio = elementAspectRatio(focusElt)
    let left = 0; let top = 0
    if (
      distortion(focusAspectRatio / containerAspectRatio * (focusBias / 100)) <
      distortion(focusAspectRatio / containerAspectRatio / (focusBias / 100))
    ) {
      top = focusBias
    } else {
      left = focusBias
    }

    arrange(
      [focusElt],
      {
        parent,
        aspectRatio: focusAspectRatio,
        letterbox: letterboxFocus,
        width: left || 100,
        height: top || 100
      }
    )
    arrange(
      elements,
      {
        parent,
        aspectRatio,
        letterbox: letterboxBlurred,
        left,
        top,
        width: 100 - left,
        height: 100 - top
      }
    )
  } else {
    arrange(elements, { parent, aspectRatio, letterbox })
  }
}

export { arrange, arrangeWithFocus }
