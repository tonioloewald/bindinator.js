/*global module */
'use strict';

(function(module) {
  module.exports = {
    arrange(elements, aspect_ratio) {
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