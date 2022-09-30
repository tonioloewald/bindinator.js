/**
# DOM Methods
Copyright ©2016-2022 Tonio Loewald

    find(selector);

document.querySelectorAll(selector) converted to a true array

    findOne(selector);

document.querySelector(selector)

    findWithin(element, selector, includeSelf);

element.querySelectorAll(selector) converted to a true array

    findOneWithin(element, selector, includeSelf);

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
// title: create, isInView, rectsOverlap tests

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
    cssVar(element, name); // obtains the value of a css-variable at a specified element
    cssVar(element, name, value); // sets hte value of a css-variable at a specified element

`cssVar` allows you to access and modify css-variables -- really nice for creating themes or
pushing computed dimensions (e.g. based on window size) through your CSS.

    create(tagName, string | HTMLElement | Object,... )
    elements.div( string | HTMLElement | Object,... )

The `create()` function and `elements` Proxy are exported from [elements.js](?source=/source/elements.js)

    succeeding(element, selector);

next sibling matching selector

    copyChildren(source, dest);

copies children of source to dest (by cloning)

    moveChildren(source, dest);

moves children of source to dest

    offset(element); // returns {x,y}

obtain the offset position of the element relative to the top-left of the window.

    within(element, mouseEvent);
    within(element, mouseEvent, margin); // true | false

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

    unwrap(element [, wrapperSelector]);

unwraps the element of its immediate parent or its closest `wrapperSelector` if provided.

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
/* global getComputedStyle */

import { makeArray, forEachKey } from './b8r.iterators.js'

export { create, elements } from './elements.js'

export const isVisible = (element, includeParents) => element &&
  getComputedStyle(element).display !== 'none' &&
  ((!includeParents) || element === document.body || isVisible(element.parentElement, true))

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

export const findWithin = (element, selector, includeSelf) => {
  const list = makeArray(element.querySelectorAll(selector))
  if (includeSelf && element.matches(selector)) {
    list.unshift(element)
  }
  return list
}

export const findOneWithin = (element, selector, includeSelf) =>
  includeSelf &&
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

export const findAbove = (elt, selector, untilElt, includeSelf) => {
  let currentElt = includeSelf ? elt : elt.parentElement
  const found = []
  while (currentElt) {
    if (currentElt === document.body) {
      break
    }
    if (typeof untilElt === 'string' && currentElt.matches(untilElt)) {
      break
    } else if (currentElt === untilElt) {
      break
    }
    if (currentElt.matches(selector)) {
      found.push(currentElt)
    }
    currentElt = currentElt.parentElement
  }
  return found
}

export const id = document.getElementById.bind(document)

export const text = document.createTextNode.bind(document)

export const fragment = document.createDocumentFragment.bind(document)

export const classes = (element, settings) => {
  forEachKey(settings, (onOff, className) => {
    if (onOff) {
      element.classList.add(className)
    } else {
      element.classList.remove(className)
    }
  })
}

export const styles = (element, settings) => {
  forEachKey(settings, (value, key) => {
    element.style[key] = value
  })
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

export const wrap = (element, wrappingElement, destSelector) => {
  try {
    const parent = element.parentElement
    const destination = destSelector ? wrappingElement.querySelector(destSelector) : wrappingElement
    parent.insertBefore(wrappingElement, element)
    destination.appendChild(element)
  } catch (e) {
    throw new Error('wrap failed')
  }
}

export const unwrap = (element, wrapperSelector) => {
  try {
    const wrapper = wrapperSelector ? element.closest(wrapperSelector) : element.parentElement
    const parent = wrapper.parentElement
    parent.insertBefore(element, wrapper)
    wrapper.remove()
  } catch (e) {
    throw new Error('unwrap failed')
  }
}

export const within = (element, mouseEvent, margin) => {
  const r = element.getBoundingClientRect()
  const { clientX, clientY } = mouseEvent
  return (
    clientX + margin > r.left &&
    clientX - margin < r.right &&
    clientY + margin > r.top &&
    clientY - margin < r.bottom
  )
}

export const isInBody = (element) => element && document.body.contains(element)

export const cssVar = (element, name, value) => {
  /* global HTMLElement */
  if (!(element instanceof HTMLElement)) {
    [element, name, value] = [document.documentElement, element, name]
  }
  if (value === undefined) {
    const htmlStyles = getComputedStyle(element)
    return htmlStyles.getPropertyValue(name).trim()
  } else {
    element.style.setProperty(name, value)
  }
}

/**
    findHighestZ(selector = 'body *') // returns highest z-index of elements matching selector
*/
export const findHighestZ = (selector = 'body *') => [...document.querySelectorAll(selector)]
  .map(elt => parseFloat(getComputedStyle(elt).zIndex))
  .reduce((z, highest = Number.MIN_SAFE_INTEGER) =>
    isNaN(z) || z < highest ? highest : z
  )
