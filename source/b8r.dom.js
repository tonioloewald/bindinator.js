/**
  # DOM Methods

  find(selector);                         // syntax sugar for querySelectorAll, returns proper array
  findOne(selector);                      // syntax sugar for querySelector
  findWithin(element, selector);          // find scoped within element
  findWithin(element, selector, true);    // find scoped within element, including the element itself
  findOneWithin(element, selector);       // findOne scoped within element
  findOneWithin(element, selector, true); // findOne scoped within element, including the element itself
  makeArray(arrayish);                    // creates a proper array from something array-like
  succeeding(element, selector);          // next succeeding sibling matching selector
  id(id_string);                          // => document.getElementById(id_string)
  text(textContent)                       // => document.createTextNode(textContent)
  fragment()                              // => document.createDocumentFragment();
  create(type)                            // => document.createElement(type);
  empty(element);                         // removes contents of element
  copyChildren(source, dest);             // copies contents of source to dest
  moveChildren(source, dest);             // moves contents of source to dest
*/
(function(module){

// TODO
// Debug versions of findOne should throw if not exactly one match
module.exports = {
  find: selector => b8r.makeArray(document.querySelectorAll(selector)),
  findOne: document.querySelector.bind(document),
  findWithin: (element, selector, include_self) => {
    var list = b8r.makeArray(element.querySelectorAll(selector));
    if (include_self && element.matches('[data-bind]')) {
      list.unshift(element);
    }
    return list;
  },
  findOneWithin: (element, selector, include_self) => include_self && element.matches(selector) ? element : element.querySelector(selector),
  makeArray: arrayish => [].slice.apply(arrayish),
  succeeding: (element, selector) => {
    while(element.nextSibling && !element.nextElementSibling.matches(selector)){
      element = element.nextElementSibling;
    }
    return element.nextElementSibling;
  },
  findAbove: (elt, selector, until_elt) => {
    var current_elt = elt.parentElement;
    var found = [];
    while(until_elt && current_elt) {
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
};

}(module));