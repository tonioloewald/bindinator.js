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

    isInBody(element); // document.body.contains(element)

returns true if the element is in the document (versus "virtual")

    isVisible(element); // getComputedStyle(element).display !== 'none'
    isVisible(element, true); // as above, but check ancestors as well

returns true if the element is not hidden by virtue of having its `display` set to 'none'

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

    cssVar(name); // obtains the value of a :root css-variable.
    cssVar(name, value); // sets the value of a :root css-variable.

`cssVar` allows you to manipulate css-variables.

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

    within(element, mouse_event);
    within(element, mouse_event, margin); // true | false

did the event occur within the element (with added margin)?

```
<div
  style="padding: 50px; background: white;"
  data-event="mousemove:_component_.within"
>
  <div class="inner" style="width: 100px; height: 100px; background: #faa; box-shadow: 0 0 0 20px #fcc;">
  </div>
</div>
<script>
  const div = findOne('.inner');
  set({
    within: evt => {
      if (b8r.within(div, evt, 20)) {
        div.textContent = 'mouse within 20px'
      } else {
        div.textContent = 'mouse well outside';
      }
    }
  })
</script>
```

    wrap(element, wrapper_element [, destination_selector]);

wraps the element with a wrapper element. If a destination_selector is provided then
the wrapped element is inserted within the indicated child, otherwise it is appended directly to
the wrapper.

    unwrap(element [, wrapper_selector]);

unwraps the element of its immediate parent or its closest `wrapper_selector` if provided.

```
<button
  data-event="
    click:_component_.toggle_wrap;
  "
>
  Click Me to toggle wrapping
</button><br>
<button
  data-event="
    click:_component_.toggle_deep_wrap;
  "
>
  Click Me to toggle deep wrapping
</button>
<div class="wrapper" style="background-color: yellow; padding: 10px;">
</div>
<div class="deep-wrapper" style="background-color: red; padding: 10px;">
  <div style="background-color: white; padding: 10px;">
    <div class="dest" style="background-color: blue; padding: 10px;">
    </div>
  </div>
</div>
<script>
  const target = findOne('.target');
  const wrapper = findOne('.wrapper');
  const deep_wrapper = findOne('.deep-wrapper');

  wrapper.remove();
  deep_wrapper.remove();

  set ({
    toggle_wrap: (evt, element) => {
      if (element.closest('.wrapper')) {
        b8r.unwrap(element);
      } else {
        b8r.wrap(element, wrapper);
      }
    },
    toggle_deep_wrap: (evt, element) => {
      if (element.closest('.deep-wrapper')) {
        b8r.unwrap(element, '.deep-wrapper');
      } else {
        b8r.wrap(element, deep_wrapper, '.dest');
      }
    }
  })
</script>
```
*/
/* global module, require */
'use strict';

const {makeArray, forEachKey} = require('./b8r.iterators.js');

const isVisible = (element, include_parents) => element &&
  getComputedStyle(element).display !== 'none' &&
  ((! include_parents) || element === document.body || isVisible(element.parentElement, true));

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
      element.lastChild.remove();
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
  },
  wrap(element, wrapping_element, dest_selector) {
    try {
      const parent = element.parentElement;
      const destination = dest_selector ? wrapping_element.querySelector(dest_selector) : wrapping_element;
      parent.insertBefore(wrapping_element, element);
      destination.appendChild(element);
    } catch(e) {
      throw 'wrap failed';
    }
  },
  unwrap(element, wrapper_selector) {
    try {
      const wrapper = wrapper_selector ? element.closest(wrapper_selector) : element.parentElement;
      const parent = wrapper.parentElement;
      parent.insertBefore(element, wrapper);
      wrapper.remove();
    } catch(e) {
      throw 'unwrap failed';
    }
  },
  within (element, mouse_event, margin) {
    const r = element.getBoundingClientRect();
    const {clientX, clientY} = mouse_event;
    return (
      clientX + margin > r.left &&
      clientX - margin < r.right &&
      clientY + margin > r.top &&
      clientY - margin < r.bottom
    );
  },
  isVisible,
  isInBody: element => element && document.body.contains(element),
  cssVar: (name, value) => {
    if (value === undefined) {
      const htmlStyles = getComputedStyle(document.querySelector('html'));
      return htmlStyles.getPropertyValue(name);
    } else {
      document.querySelector('html').style.setProperty(name, value);
    }
  }
};
