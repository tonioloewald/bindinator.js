/**
# pixel.js
*/
/* global module */
'use strict';

module.exports = {
  render(color) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const g = c.getContext('2d');
    g.fillStyle = color || 'white';
    g.fillRect(0,0,1,1);
    return c.toDataURL();
  },
};
