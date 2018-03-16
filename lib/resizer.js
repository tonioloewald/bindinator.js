/**
# resizer

Make an element resize their container
*/

'use strict';

const b8r = require('../source/b8r.js');

const resize_origin = {};
const mousedown = evt => {
  const target = evt.target.closest('.resizer-target') || evt.target.parentElement;
  resize_origin.w = target.offsetWidth;
  resize_origin.h = target.offsetHeight;
  resize_origin.x = evt.clientX;
  resize_origin.y = evt.clientY;
  resize_origin.target = target;
  b8r.onAny('mousemove', 'resizer.mousemove');
  b8r.onAny('mouseup', 'resizer.mouseup');
};

const mousemove = evt => {
  const target = resize_origin.target;
  const dx = evt.clientX - resize_origin.x;
  const dy = evt.clientY - resize_origin.y;
  target.style.width = dx + resize_origin.w + 'px';
  target.style.height = dy + resize_origin.h + 'px';
  b8r.trigger('resize', target.querySelector('.resizer-target') || target);
};

const mouseup = evt => {
  mousemove(evt);
  b8r.offAny('mousemove', 'resizer.mousemove');
  b8r.offAny('mouseup', 'resizer.mouseup');
};

b8r.register('resizer', {mousedown, mousemove, mouseup});

module.exports = {};
