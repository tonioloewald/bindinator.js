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

    isInView(element [, view]);

returns true if the element is within the bounds of a specified view (or the window)

    rectsOverlap(r, s);

returns true if two rectangles (per `element.getBoundingClientRect()`) overlap. This is used
by isInView, but is also useful if you need to check a lot of rect intersections and
minimize calls to `getBoundingClientRect` (which isn't cheap). Note that it uses `width` and
`height` versus `right` and `bottom` because for some clipped elements (such as document.body in
many cases) these will not agree.

~~~~
div = b8r.create('div');
div.style.position = 'absolute';
div.style.top = '-200px';
div.style.left = 0;
div.style.width = '100px';
div.style.height = '100px';
document.body.appendChild(div);
Test(() => b8r.isInView(div), 'div is above clipping region').shouldBe(false);
div.style.top = 0;
Test(() => b8r.isInView(div), 'div is top-left of clipping region').shouldBe(true);
div.style.top = '99999px';
Test(() => b8r.isInView(div), 'div is waaaay below clipping region').shouldBe(false);
div.remove();
const r = {left: 0, top: 0, width: 100, height: 100};
const s = {left: 0, top: 0, width: 100, height: 100};
Test(() => b8r.rectsOverlap(r,s), 'identical').shouldBe(true);
r.left = 90;
Test(() => b8r.rectsOverlap(r,s), 'offset but overlapping').shouldBe(true);
s.top = 101;
Test(() => b8r.rectsOverlap(r,s), 'second is below').shouldBe(false);
s.top = 0;
s.left = -101;
Test(() => b8r.rectsOverlap(r,s), 'second is above').shouldBe(false);
~~~~
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

takes a map of style settings to values and sets those styles accordingly. Note that you'll
need to camelcase hypenated settings, so 'font-family' becomes `fontFamily`.

    cssVar(name); // obtains the value of a :root css-variable.
    cssVar(name, value); // sets the value of a :root css-variable.

`cssVar` allows you to access and modify css-variables -- really nice for creating themes or
pushing computed dimensions (e.g. based on window size) through your CSS.

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

import { makeArray, forEachKey } from './b8r.iterators.js'

export const isVisible = (element, include_parents) => element &&
  getComputedStyle(element).display !== 'none' &&
  ((!include_parents) || element === document.body || isVisible(element.parentElement, true))

export const isInView = (element, view) => {
  if (!element || !isVisible(element, true)) {
    return false
  }
  const r = element.getBoundingClientRect()
  const s = view ? view.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  return rectsOverlap(r, s)
}

export const rectsOverlap = (r, s) => !(
  r.top > s.top + s.height ||
                                 r.top + r.height < s.top ||
                                 r.left > s.left + s.width ||
                                 r.left + r.width < s.left
)

export const find = selector => makeArray(document.querySelectorAll(selector))

export const findOne = document.querySelector.bind(document)

export const findWithin = (element, selector, include_self) => {
  const list = makeArray(element.querySelectorAll(selector))
  if (include_self && element.matches(selector)) {
    list.unshift(element)
  }
  return list
}

export const findOneWithin = (element, selector, include_self) =>
  include_self &&
  element.matches(selector) ? element : element.querySelector(selector)

export const succeeding = (element, selector) => {
  while (element.nextElementSibling && !element.nextElementSibling.matches(selector)) {
    element = element.nextElementSibling
  }
  return element.nextElementSibling
}

export const preceding = (element, selector) => {
  while (element.previousElementSibling && !element.previousElementSibling.matches(selector)) {
    element = element.previousElementSibling
  }
  return element.previousElementSibling
}

export const findAbove = (elt, selector, until_elt, include_self) => {
  let current_elt = include_self ? elt : elt.parentElement
  const found = []
  while (current_elt) {
    if (current_elt === document.body) {
      break
    }
    if (typeof until_elt === 'string' && current_elt.matches(until_elt)) {
      break
    } else if (current_elt === until_elt) {
      break
    }
    if (current_elt.matches(selector)) {
      found.push(current_elt)
    }
    current_elt = current_elt.parentElement
  }
  return found
}

export const id = document.getElementById.bind(document)

export const text = document.createTextNode.bind(document)

export const fragment = document.createDocumentFragment.bind(document)

export const create = document.createElement.bind(document)

export const classes = (element, settings) => {
  forEachKey(settings, (on_off, class_name) => {
    if (on_off) {
      element.classList.add(class_name)
    } else {
      element.classList.remove(class_name)
    }
  })
}

export const styles = (element, settings) => {
  forEachKey(settings, (value, key) => element.style[key] = value)
}

export const empty = (element) => {
  while (element.lastChild) {
    element.lastChild.remove()
  }
}

export const elementIndex = (element) => [...element.parentElement.children].indexOf(element)

export const moveChildren = (source, dest) => {
  while (source.firstChild) {
    dest.appendChild(source.firstChild)
  }
}

export const copyChildren = (source, dest) => {
  let element = source.firstChild
  while (element) {
    dest.appendChild(element.cloneNode(true))
    element = element.nextSibling
  }
}

export const wrap = (element, wrapping_element, dest_selector) => {
  try {
    const parent = element.parentElement
    const destination = dest_selector ? wrapping_element.querySelector(dest_selector) : wrapping_element
    parent.insertBefore(wrapping_element, element)
    destination.appendChild(element)
  } catch (e) {
    throw 'wrap failed'
  }
}

export const unwrap = (element, wrapper_selector) => {
  try {
    const wrapper = wrapper_selector ? element.closest(wrapper_selector) : element.parentElement
    const parent = wrapper.parentElement
    parent.insertBefore(element, wrapper)
    wrapper.remove()
  } catch (e) {
    throw 'unwrap failed'
  }
}

export const within = (element, mouse_event, margin) => {
  const r = element.getBoundingClientRect()
  const { clientX, clientY } = mouse_event
  return (
    clientX + margin > r.left &&
    clientX - margin < r.right &&
    clientY + margin > r.top &&
    clientY - margin < r.bottom
  )
}

export const isInBody = (element) => element && document.body.contains(element)

export const cssVar = (name, value) => {
  if (value === undefined) {
    const htmlStyles = getComputedStyle(document.querySelector('html'))
    return htmlStyles.getPropertyValue(name)
  } else {
    document.querySelector('html').style.setProperty(name, value)
  }
}
