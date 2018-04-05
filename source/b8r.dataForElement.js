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
    const json = JSON.stringify(data);
    data_waiting_for_components.push({target_element, data: json});
  }
};

const removeDataForElement = (target_element) => {
  const idx = data_waiting_for_components.findIndex(item => item.target_element === target_element);
  if (idx > -1) {
    delete data_waiting_for_components[idx];
  }
};

const dataForElement = (target_element, _default) => {
  const idx = data_waiting_for_components.findIndex(item => item.target_element === target_element);
  if (idx === -1) {
    const json = target_element.dataset.json;
    return json ? JSON.parse(json) : _default;
  } else {
    const {data} = JSON.parse(data_waiting_for_components[idx]);
    delete data_waiting_for_components[idx];
    return data;
  }
};

module.exports = {
  saveDataForElement,
  dataForElement
};
