/**
# point2d

*/
/* global module */
'use strict'

class Point2D {
  constructor (x, y) {
    Object.assign(this, { x, y })
  }

  distanceTo (...args) {
    let pt
    if (args[0] instanceof Point2D) {
      pt = args[0]
    } else {
      pt = new Point2D(...args)
    }

    return Math.sqrt(Math.pow(this.x - pt.x, 2) + Math.pow(this.y - pt.y, 2))
  }
}

module.exports = Point2D
