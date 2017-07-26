/**
# DOM Methods
Copyright ©2016-2017 Tonio Loewald

    find(selector);

document.querySelectorAll(selector) converted to a true array

    findOne(selector);

document.querySelector(selector)

    findWithin(element, selector, include_self);

element.querySelectorAll(selector) converted to a true array

    findOneWithin(element, selector, include_self);

element.querySelector(selector)

    id(id_string)

document.getElementById(id_string)

    text(textContent)

document.createTextNode(textContent)

    fragment()

document.createDocumentFragment()

    empty()

remove all child elements from the element

    classes(element, map);

takes a map of class names to booleans and adds / removes those classes accordingly.

    styles(element, map);

takes a map of style settings to values and sets those styles accordingly.

    create(tagName)

document.createElement(tagName)

     succeeding(element, selector);

next sibling matching selector

    copyChildren(source, dest);

copies children of source to dest (by cloning)

    moveChildren(source, dest);

moves children of source to dest

    offset(element); // returns {x,y}

obtain the offset position of the element relative to the top-left of the window.
*/
/* global module, require */
'use strict';

const {makeArray, forEachKey} = require('./b8r.iterators.js');

module.exports = {
  find: selector => makeArray(document.querySelectorAll(selector)),
  findOne: document.querySelector.bind(document),
  findWithin: (element, selector, include_self) => {
    let list = makeArray(element.querySelectorAll(selector));
    if (include_self && element.matches(selector)) {
      list.unshift(element);
    }
    return list;
  },
  findOneWithin: (element, selector, include_self) =>
    include_self &&
    element.matches(selector) ? element : element.querySelector(selector),
  succeeding: (element, selector) => {
    while(element.nextElementSibling && !element.nextElementSibling.matches(selector)){
      element = element.nextElementSibling;
    }
    return element.nextElementSibling;
  },
  preceding: (element, selector) => {
    while(element.previousElementSibling && !element.previousElementSibling.matches(selector)){
      element = element.previousElementSibling;
    }
    return element.previousElementSibling;
  },
  findAbove: (elt, selector, until_elt, include_self) => {
    let current_elt = include_self ? elt : elt.parentElement;
    let found = [];
    while(current_elt) {
      if (current_elt === document.body) {
        break;
      }
      if (typeof until_elt === 'string' && current_elt.matches(until_elt)) {
        break;
      } else if (current_elt === until_elt) {
        break;
      }
      if(current_elt.matches(selector)) {
        found.push(current_elt);
      }
      current_elt = current_elt.parentElement;
    }
    return found;
  },
  id: document.getElementById.bind(document),
  text: document.createTextNode.bind(document),
  fragment: document.createDocumentFragment.bind(document),
  create: document.createElement.bind(document),
  classes: (element, settings) => {
    forEachKey(settings, (on_off, class_name) => {
      if (on_off) {
        element.classList.add(class_name);
      } else {
        element.classList.remove(class_name);
      }
    });
  },
  styles: (element, settings) => {
    forEachKey(settings, (value, key) => element.style[key] = value);
  },
  empty (element) {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
  },
  elementIndex (element) {
    return makeArray(element.parentElement.children).indexOf(element);
  },
  moveChildren (source, dest) {
    while (source.firstChild) {
      dest.appendChild(source.firstChild);
    }
  },
  copyChildren (source, dest) {
    let element = source.firstChild;
    while (element) {
      dest.appendChild(element.cloneNode(true));
      element = element.nextSibling;
    }
  },
  offset (element) {
    return element.getBoundingClientRect();
  }
};
