/**
# relative-placement
*/
/* global module */
'use strict'

module.exports = {
  top: (element, target) => {
    const rect = target.getBoundingClientRect()
    element.style.position = 'fixed'
    element.style.top = `${rect.bottom}px`
    element.style.left = `${rect.left + (rect.width - element.offsetWidth) * 0.5}px`
  },
  topRight: (element, target) => {
    const rect = target.getBoundingClientRect()
    element.style.position = 'fixed'
    element.style.top = `${rect.bottom}px`
    element.style.right = `${window.innerWidth - rect.right}px`
  }
}
