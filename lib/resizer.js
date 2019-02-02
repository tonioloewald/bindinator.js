/**
# resizer

Make an element resize their container
*/
/* global require, module */
'use strict';

import b8r from '../source/b8r.js';
const int = x => parseInt(x, 10);

const resize_origin = {};
const mousedown = evt => {
  const target = evt.target.closest('.resizer-target') || evt.target.parentElement;
  resize_origin.w = target.offsetWidth;
  resize_origin.h = target.offsetHeight;
  resize_origin.x = evt.clientX;
  resize_origin.y = evt.clientY;
  resize_origin.target = target;
  const style = getComputedStyle(target);
  resize_origin.min_width = int(style.minWidth);
  resize_origin.min_height = int(style.minHeight);
  b8r.onAny('mousemove', 'resizer.mousemove');
  b8r.onAny('mouseup', 'resizer.mouseup');
};

const mousemove = evt => {
  const target = resize_origin.target;
  const dx = evt.clientX - resize_origin.x;
  const dy = evt.clientY - resize_origin.y;
  target.style.width = Math.max(dx + resize_origin.w, resize_origin.min_width) + 'px';
  target.style.height = Math.max(dy + resize_origin.h, resize_origin.min_height) + 'px';
  b8r.trigger('resize', target.querySelector('.resizer-target') || target);
};

const mouseup = evt => {
  mousemove(evt);
  b8r.offAny('mousemove', 'resizer.mousemove');
  b8r.offAny('mouseup', 'resizer.mouseup');
};

b8r.register('resizer', {mousedown, mousemove, mouseup});

export {mousedown, mousemove, mouseup};
