/**
# fromTargets
Copyright ©2016-2017 Tonio Loewald

## Getting bound data from the DOM

The following binding *targets* will automatically copy data from the DOM to bound objects
when an input or change event fires on the bound element:

### value

The **value** of `<input>` and `<textarea>` elements; it will correctly return
the value of `<input type="radio" ...>` elements.

If you bind to a **component instance**'s value it will map directly to the component's
value.

#### forcing value to be a number

`<input type="number">` and `<input type="range">` will have their values returned as numbers
(rather than strings). Likewise, if you add `data-type="number"` to an element with a value
(e.g. `<select>`), its value will be returned as numeric.

> ### Two-Way Bindings
>
> `value` and most "from"-bindings are also ["to"-bindings](#source=source/b8r.toTargets.js).
> which means that an element will automatically be populated with bound data, and updated
> when it is set or changed *by path* (e.g. `set('path.to.data', newValue)`) or the path to that
> data is `touch()`ed (e.g. `touch('path.to.data'))`).

### checked

The **checked** of an `<input type="checkbox">` or `<input type="radio">` element.

### selected

The **selected** attribute on an `<option>`.

### text

The **textContent** of a typical element (including div, span, and so forth). Note
that these elements will only get change events if you send them.

### prop

Allows you to get data from element properties (e.g. the `currentTime` of an `HTMLMediaElement`).

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you get (and set) component properties.
*/
/* global module */
'use strict'

import { find } from './b8r.dom.js'
import { get, getByPath } from './b8r.registry.js'

export const value = (element) => {
  let pendingValue = element.dataset.pendingValue
  if (pendingValue) {
    pendingValue = JSON.parse(pendingValue)
    element.value = pendingValue
    if (element.value === pendingValue) {
      // console.log('restored pending value', element, pendingValue);
      if (element.dataset.pendingValue) {
        delete element.dataset.pendingValue
      }
    }
  }
  if (element.matches('input[type=radio]')) {
    const name = element.getAttribute('name')
    const checked = find(`input[type=radio][name=${name}]`).find(elt => elt.checked)
    return checked ? checked.value : null
  } else if (element.matches('[data-type=number],input[type=number],input[type=range]')) {
    return parseFloat(element.value)
  } else {
    if (element.dataset.componentId) {
      return get(`${element.dataset.componentId}.value`)
    } else {
      return element.value
    }
  }
}

export const checked = (element) => element.indeterminate ? null : element.checked

export const selected = (element) => element.selected

export const text = (element) => element.textContent

export const currentTime = (element) => element.currentTime

export const playbackRate = (element) => element.playbackRate

export const prop = (element, property) => element[property]

export const component = (element, path) => {
  const componentId = element.dataset.componentId
  return getByPath(componentId, path)
}

export const fromMethod = (element, path) => {
  let [model, ...method] = path.split('.')
  method = method.join('.')
  return getByPath(model, method)(element)
}
