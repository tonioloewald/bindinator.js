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
    <script>
      require('path/to/biggrid.js');
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

    slice(list, list_template, single_column=false);

`slice` will return a minimal number of elements, and it will insert padding elements above
and below the list to keep the scrolling area size constant and the position of the elements
correct. It will also add `resize` and `scroll` handlers to the container element.

`single_column` forces a single column (allowing biggrid to handle big lists -- where each
list item is a fixed height).
*/
/* global require, module */

'use strict';

import b8r from '../source/b8r.js';

const toInt = x => parseInt(x, 10);

const getDimensions = elt => {
  if (elt.dataset.biggridItemSize) {
    const [width, height] = elt.dataset.biggridItemSize.split(',').map(toInt);
    return {width, height};
  } else {
    elt = elt.cloneNode(true);
    delete elt.dataset.list;
    elt.style.display = '';

    const wrapper = b8r.create('div');
    wrapper.style.padding = 0;
    wrapper.style.position = 'absolute';
    wrapper.style.bottom = '-200%';
    wrapper.style.left = 0;
    wrapper.appendChild(elt);

    document.body.appendChild(wrapper);
    const dimensions = {
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
    };
    wrapper.remove();
    return dimensions;
  }
};

const update = (evt, target) => {
  target = target.matches('[data-list].biggrid-item') ?
           target :
           target.querySelector('[data-list].biggrid-item');
  b8r.bindAll(target);
};

const _spacer = (target, type) => {
  let spacer = target.querySelector(`.biggrid-${type}-spacer`);
  if (!spacer) {
    spacer = b8r.create('div');
    spacer.classList.add(`biggrid-${type}-spacer`);
    spacer.style.width = '100%';
    if (type === 'top') {
      target.insertBefore(spacer, target.firstChild);
    } else {
      target.appendChild(spacer);
    }
  }
  return spacer;
};

const slices = []; // memoized responses {target, row_size, rows, visible_rows, first_row}

const slice = (list, target, single_column=false) => {
  // TODO preserve scroll position after resize event
  const container = target.closest('.biggrid-container') || target.parentElement;
  let slice = slices.find(slice => slice.target === target);
  if (! slice) {
    slice = {target, item: getDimensions(target)};
    slices.push(slice);
    target.classList.add('biggrid-item');
    b8r.on(container, ['scroll', 'resize'], 'biggrid.update');
  }
  let use_existing_slice = false;

  const top_spacer = _spacer(container, 'top');
  const bottom_spacer = _spacer(container, 'bottom');

  if (!list || !list.length || ! b8r.isVisible(container, true)) {
    b8r.hide(top_spacer);
    b8r.hide(bottom_spacer);
    use_existing_slice = true;
  }

  const [pad_width, pad_height] = (container.dataset.biggridPadding || '0,0').split(',').map(toInt);
  const h = container.clientHeight - pad_height;
  const w = container.clientWidth - pad_width;

  if (h <= slice.item.height && w <= slice.item.width) {
    // console.warn('biggrid -- insufficient room to display any items', target);
    use_existing_slice = true;
  }

  if (! use_existing_slice) {
    slice.row_size = single_column ? 1 : Math.max(1, Math.floor(w / slice.item.width));
    slice.rows = Math.ceil(list.length / slice.row_size);
    slice.visible_rows = Math.min(Math.ceil(h / slice.item.height + 1), slice.rows);
    slice.first_row = Math.min(
      slice.rows - slice.visible_rows,
      Math.floor(Math.max(container.scrollTop, 0) / slice.item.height)
    );
    slice.trailing_rows = slice.rows - slice.visible_rows - slice.first_row;
  }

  b8r.show(top_spacer);
  b8r.show(bottom_spacer);
  top_spacer.style.height = (slice.first_row * slice.item.height) + 'px';
  bottom_spacer.style.height = (slice.trailing_rows * slice.item.height) + 'px';

  return list.slice(
    slice.first_row * slice.row_size,
    (slice.first_row + slice.visible_rows) * slice.row_size
  );
};

const biggrid = {
  update,
  slice,
};

b8r.register('biggrid', biggrid);

export {
  biggrid,
  update,
  slice,
  getDimensions,
};
