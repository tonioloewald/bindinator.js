/**
# Data for Element
*/
/* jshint latedef:false */
/* global module */
'use strict';

const data_waiting_for_components = [];  // { target_element, data }

const saveDataForElement = (target_element, data) => {
  if (data) {
    removeDataForElement(target_element);
    data_waiting_for_components.push({target_element, data});
  }
};

const removeDataForElement = (target_element) => {
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      delete data_waiting_for_components[i].data;
    }
  }
};

const dataForElement = (target_element, _default) => {
  var data;
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      data = data_waiting_for_components[i].data;
      removeDataForElement(target_element);
      return data;
    }
  }

  const json = target_element.dataset.json;
  if (json) {
    return JSON.parse(json);
  }

  return _default;
};

module.exports = {
  saveDataForElement,
  dataForElement
};
