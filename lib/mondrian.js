/**
# Mondrian

Mondrian is a tool for automatically laying out rectangles within a rectangle
with no gaps.

Usage:

    mondrian.arrange(elements_array[, aspect_ratio]);

**elements_array** is a list of elements that will be arranged within their
current parent element.
Each element will be given a top, left, width, and height in percentages so that
the positions
will be maintained automatically if the parent is resized.

**aspect_ratio** is the desired width / height of the child elements. By default
this is 1.

No styling is applied to the elements in question, but the elements should be
`position: absolute;`
and the parent should be `position: absolute|relative|fixed`. If you add
`transition: 0.25s ease-out`
(say) then elements will transition between layouts.

Mondrian doesn't try to handle resize events, etc. If you want to update the
layout after resizing,
adding, or subtracting elements simply call `arrange()` again.
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

module.exports = {
  arrange(elements, aspect_ratio, letterbox_threshold) {
    const item_count = elements.length;
    if (elements.length === 0) {
      return;
    }

    if (aspect_ratio === undefined) {
      aspect_ratio = 1;
    }

    const container = elements[0].parentElement;
    const container_aspect_ratio = container.offsetWidth / container.offsetHeight;
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

    const row_height = 100 / rows.length;
    rows.forEach((row, row_index) => {
      let left = 0;
      row.forEach(elt => {
        const width = 100 / row.length;
        const cell_aspect_ratio = container_aspect_ratio / row.length * rows.length;
        const target_aspect_ratio = element_aspect_ratio(elt);
        if (letterbox_threshold) {
          const _distortion = distortion(cell_aspect_ratio / target_aspect_ratio);
          if (_distortion > letterbox_threshold) {
            elt.classList.add('mondrian-letterbox');
          } else {
            elt.classList.remove('mondrian-letterbox');
          }
        }
        elt.style.width = width.toFixed(1) + '%';
        elt.style.height = row_height.toFixed(1) + '%';
        elt.style.top = (row_height * row_index).toFixed(1) + '%';
        elt.style.left = left.toFixed(1) + '%';
        left += width;
      });
    });
  }
};
