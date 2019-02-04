/**
# pixel.js
*/
/* global module */
'use strict'

export const render = (color) => {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  const g = c.getContext('2d')
  g.fillStyle = color || 'rgba(255,255,255,0.3)'
  g.fillRect(0, 0, 1, 1)
  return c.toDataURL()
}
