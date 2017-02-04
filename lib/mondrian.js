/**
# Mondrian

Mondrian is a tool for automatically laying out rectangles within a rectangle with no gaps.

Usage:

    mondrian.arrange(elements_array[, aspect_ratio]);

**elements_array** is a list of elements that will be arranged within their current parent element.
Each element will be given a top, left, width, and height in percentages so that the positions
will be maintained automatically if the parent is resized.

**aspect_ratio** is the desired width / height of the child elements relative to the parent, e.g.
if you want to lay out rects that are 4/3 within a 4/3 rectangle, you'd pass 1 (which is the default).
If you want to lay out rects that are 2/3 (portrait) within a 16/9 (widescreen) rectangle you'd pass
0.37125 (2/3 x 16/9). Mondrian will try to get as close as possible to that aspect ratio as it can.

No styling is applied to the elements in question, but the elements should be `position: absolute;`
and the parent should be `position: absolute|relative|fixed`. If you add `transition: 0.25s ease-out` 
(say) then elements will transition between layouts.

Mondrian doesn't try to handle resize events, etc. If you want to update the layout after resizing,
adding, or subtracting elements simply call `arrange()` again.
*/
/*global module */
'use strict';

(function(module) {
  module.exports = {
    arrange(elements, aspect_ratio) {
      if (!aspect_ratio) {
        aspect_ratio = 1;
      }
      const item_count = elements.length;
      if(elements.length === 0) {
        return;
      }

      var row_count = 1;
      var col_count = 1;
      const rows = [[]];
      while(row_count * col_count < item_count) {
        // aspect ratio adjustment
        if((row_count + 1) * aspect_ratio < col_count + 1) {
          row_count += 1;
          rows.push([]);
        } else {
          col_count += 1;
        }
      }

      const ave_items_per_row = item_count / row_count;
      for(var i = 0; i < item_count; i++) {
        var row = Math.floor(i / ave_items_per_row);
        rows[row].push(elements[i]);
      }

      const row_height = 100 / rows.length;
      rows.forEach((row, row_index) => {
        var left = 0;
        row.forEach(elt => {
          var width = Math.round(100 / row.length);
          elt.style.width = width + '%';
          elt.style.height = row_height + '%';
          elt.style.top = (row_height * row_index) + '%';
          elt.style.left = left + '%';
          left += width;
        });
      });
    }
  };
}(module));