/**
# Data for Element
*/
/* jshint latedef:false */
'use strict'

const dataWaitingForComponents = [] // { targetElement, data }

const saveDataForElement = (targetElement, data) => {
  if (data) {
    removeDataForElement(targetElement)
    dataWaitingForComponents.push({ targetElement, data })
  }
}

const removeDataForElement = (targetElement) => {
  for (var i = 0; i < dataWaitingForComponents.length; i++) {
    if (dataWaitingForComponents[i].targetElement === targetElement) {
      delete dataWaitingForComponents[i].data
    }
  }
}

const dataForElement = (targetElement, _default) => {
  var data
  for (var i = 0; i < dataWaitingForComponents.length; i++) {
    if (dataWaitingForComponents[i].targetElement === targetElement) {
      data = dataWaitingForComponents[i].data
      removeDataForElement(targetElement)
      return data
    }
  }

  const json = targetElement.dataset.json
  if (json) {
    return JSON.parse(json)
  }

  return _default
}

export {
  saveDataForElement,
  dataForElement
}
