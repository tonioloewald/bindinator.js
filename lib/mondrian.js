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

(function(module) {
  const distance_from_1 = a => Math.abs(Math.log(a));

  module.exports = {
    arrange(elements, aspect_ratio) {
      const item_count = elements.length;
      if (elements.length === 0) {
        return;
      }

      const container_aspect_ratio = elements[0].parentElement.offsetWidth /
          elements[0].parentElement.offsetHeight;
      const target_aspect_ratio = (aspect_ratio || 1) / container_aspect_ratio;

      var row_count = 1;
      var col_count = 1;
      const rows = [[]];
      while (row_count * col_count < item_count) {
        // aspect ratio adjustment
        var distortion_with_new_row =
            distance_from_1((row_count + 1) / col_count / target_aspect_ratio);
        var distortion_with_new_col =
            distance_from_1(row_count / (col_count + 1) / target_aspect_ratio);

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
        var left = 0;
        row.forEach(elt => {
          var width = 100 / row.length;
          elt.style.width = width.toFixed(2) + '%';
          elt.style.height = row_height.toFixed(2) + '%';
          elt.style.top = (row_height * row_index).toFixed(2) + '%';
          elt.style.left = left.toFixed(2) + '%';
          left += width;
        });
      });
    }
  };
}(module));