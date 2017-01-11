/**
# DOM Methods
Copyright ©2016-2017 Tonio Loewald

    b8r.find(selector);

document.querySelectorAll(selector) converted to a true array

    b8r.findOne(selector);

document.querySelector(selector)

    b8r.findWithin(element, selector);

element.querySelectorAll(selector) converted to a true array

    b8r.findOneWithin(element, selector);

element.querySelector(selector)

    b8r.id(id_string)

document.getElementById(id_string)

    b8r.text(textContent)

document.createTextNode(textContent)

    b8r.fragment()

document.crateDocumentFragment()

    b8r.empty()

remove all child elements from the element

    b8r.create(tagName)

document.createElement(tagName)

    b8r. succeeding(element, selector);

next sibling matching selector

    b8r.copyChildren(source, dest);

copies children of source to dest (by cloning)

    b8r.moveChildren(source, dest);

moves children of source to dest
*/
/* global module */
'use strict';

module.exports = function(b8r){

// TODO
// Debug versions of findOne should throw if not exactly one match
Object.assign(b8r, {
  find: selector => b8r.makeArray(document.querySelectorAll(selector)),
  findOne: document.querySelector.bind(document),
  findWithin: (element, selector, include_self) => {
    var list = b8r.makeArray(element.querySelectorAll(selector));
    if (include_self && element.matches(selector)) {
      list.unshift(element);
    }
    return list;
  },
  findOneWithin: (element, selector, include_self) => include_self && element.matches(selector) ? element : element.querySelector(selector),
  succeeding: (element, selector) => {
    while(element.nextSibling && !element.nextElementSibling.matches(selector)){
      element = element.nextElementSibling;
    }
    return element.nextElementSibling;
  },
  findAbove: (elt, selector, until_elt) => {
    var current_elt = elt.parentElement;
    var found = [];
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
  empty (element) {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
  },
  elementIndex (element) {
    return b8r.makeArray(element.parentElement.children).indexOf(element);
  },
  moveChildren (source, dest) {
    while (source.firstChild) {
      dest.appendChild(source.firstChild);
    }
  },
  copyChildren (source, dest) {
    var element = source.firstChild;
    while (element) {
      dest.appendChild(element.cloneNode(true));
      element = element.nextSibling;
    }
  },
});

};