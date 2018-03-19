/**
# Mondrian

Mondrian is a tool for automatically laying out rectangular elements within their shared parent
element with no gaps, with as "fair" a disbribution of space as possible.

Usage:

    mondrian.arrange(
      elements_array,
      aspect_ratio=1,
      letterbox_threshold=false,
      offset={left:0, top: 0},
      dimensions={width: 100, height:100}
    );

To allow elements to be "focused" you can use:

    mondrian.arrange_with_focus(
      elements,
      aspect_ratio=1,
      letterbox_threshold=false,
      letterbox={focus: 1.1, blurred: 2}
    );

In the latter case, the first (which should be the only) element with the class
`mondrian-focus` will be given 80% of the available space (the top or left 80%
depending on what better matches its aspect ratio) and the remaining elements
will be arranged as nicely as possible in the remaining 20%.

**elements_array** is a list of elements that will be arranged within their
current parent element.

Each element will be given a top, left, width, and height in **percentages** so that
the positions will be maintained automatically if the parent is resized.

**aspect_ratio** is the desired width / height of the child elements. By default
this is 1.

**letterbox_threshold** is dictates whether mondrian will attempt to letterbox
a given element because it will be too distorted/cropped otherwise. If the element's
slot's aspect ratio is more than this proportion away from ideal, it will be letterboxed.
If the threshold is `false` it will never be letterboxed.

**letterbox** is the letterbox_threshold when an element is focused for the focused and
other ("blurred") elements.

**offset** and **dimensions** are used to position the elements within a subset of the
parent (used chiefly by `arrange_with_focus`). Both are in percentages of the parent.

No styling is applied to the elements in question, but the elements should be
`position: absolute;` and the parent should be `position: absolute|relative|fixed`.
If you add `transition: 0.25s ease-out` (say) then elements will transition between layouts.

Mondrian doesn't try to handle resize events, etc. If you want to update the
layout after resizing, adding, or subtracting elements simply call `arrange()` again.
*/
/*global module */
'use strict';

const distortion = a => (a > 1) ? a : (1 / (a || 0.001));
const size_target_selector = 'video,canvas,img';
const element_aspect_ratio = element => {
  if (!element.matches(size_target_selector)) {
    element = element.querySelector(size_target_selector) || element;
  }
  let w, h;
  if (element instanceof HTMLCanvasElement) {
    w = element.width;
    h = element.height;
  } else if (element instanceof HTMLImageElement) {
    w = element.naturalWidth;
    h = element.naturalHeight;
  } else if (element instanceof HTMLVideoElement) {
    w = element.videoWidth;
    h = element.videoHeight;
  } else {
    w = element.offsetWidth;
    h = element.offsetHeight;
  }
  return h ? w / h : 1;
};

// rect, if provided, has top/left in percentages and width/height in pixels (or proportions)
function arrange (elements, aspect_ratio=1, letterbox_threshold=false, offset={left: 0, top: 0}, dimensions={width: 100, height: 100}) {
  const item_count = elements.length;
  if (elements.length === 0) {
    return;
  }

  const rect = elements[0].parentElement.getBoundingClientRect();
  const container_aspect_ratio = rect.width * dimensions.width / (rect.height * dimensions.height);
  const target_aspect_ratio = aspect_ratio / container_aspect_ratio;

  var row_count = 1;
  var col_count = 1;
  const rows = [[]];
  while (row_count * col_count < item_count) {
    // aspect ratio adjustment
    var distortion_with_new_row = distortion((row_count + 1) / col_count / target_aspect_ratio);
    var distortion_with_new_col = distortion(row_count / (col_count + 1) / target_aspect_ratio);

    if (distortion_with_new_row < distortion_with_new_col) {
      row_count += 1;
      rows.push([]);
    } else {
      col_count += 1;
    }
  }

  const ave_items_per_row = item_count / row_count;
  for (var i = 0; i < item_count; i++) {
    var row = Math.floor(i / ave_items_per_row);
    rows[row].push(elements[i]);
  }

  const row_height = dimensions.height / rows.length;
  rows.forEach((row, row_index) => {
    let left = offset.left;
    row.forEach(elt => {
      const width = dimensions.width / row.length;
      const cell_aspect_ratio = container_aspect_ratio / row.length * rows.length;
      const target_aspect_ratio = element_aspect_ratio(elt);
      const _distortion = distortion(cell_aspect_ratio / target_aspect_ratio);
      const css = {
        width: width.toFixed(2) + '%',
        height: row_height.toFixed(2) + '%',
        left: left.toFixed(2) + '%',
        top: (offset.top + row_height * row_index).toFixed(2) + '%',
      };

      if (letterbox_threshold && _distortion > letterbox_threshold) {
        if (cell_aspect_ratio < target_aspect_ratio) {
          // target is wider than the cell, so shrink it and push it down
          css.height = (row_height / _distortion).toFixed(2) + '%';
          css.top = (offset.top + row_height * row_index + (row_height - row_height / _distortion) * 0.5).toFixed(2) + '%';
        } else {
          // target is taller than the cell, so shrink it and push it right
          css.width = (width / _distortion).toFixed(2) + '%';
          css.left = (left + (width - width / _distortion) * 0.5).toFixed(2) + '%';
        }
      }
      Object.assign(elt.style, css);
      left += width;
    });
  });
}

function arrange_with_focus (elements, aspect_ratio=1, letterbox_threshold=false, letterbox={focus: 1.1, blurred: 2}) {
  const focus_idx = elements.findIndex(elt => elt.classList.contains('mondrian-focus'));
  if (elements.length > 1 && focus_idx > -1) {
    const rect = elements[0].parentElement.getBoundingClientRect();
    const container_aspect_ratio = rect.width / (rect.height + 0.001);
    const focus_elt = elements[focus_idx];
    elements.splice(focus_idx, 1);
    focus_elt.style.top = focus_elt.style.left = 0;
    const focus_aspect_ratio = element_aspect_ratio(focus_elt);
    let focus_dimensions, offset, dimensions;
    if (
      distortion(focus_aspect_ratio/container_aspect_ratio * 0.8)
      < distortion(focus_aspect_ratio/container_aspect_ratio / 0.8)
    ) {
      offset = {left: 0, top: 80};
      dimensions = {width: 100, height: 20};
      focus_dimensions = {width: 100, height: 80};
    } else {
      offset = {left: 80, top: 0};
      dimensions = {width: 20, height: 100};
      focus_dimensions = {width: 80, height: 100};
    }

    arrange([focus_elt], focus_aspect_ratio, letterbox.focus, {left: 0, top: 0}, focus_dimensions);
    arrange(elements, aspect_ratio, letterbox.blurred, offset, dimensions);
  } else {
    arrange(elements, aspect_ratio, letterbox_threshold);
  }
}

module.exports = { arrange, arrange_with_focus };
