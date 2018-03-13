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

> ### Two-Way Bindings
>
> `value` and most "from"-bindings are also ["to"-bindings](#source=source/b8r.toTargets.js).
> which means that an element will automatically be populated with bound data, and updated
> when it is set or changed *by path* (e.g. `set('path.to.data', new_value)`) or the path to that
> data is `touch()`ed (e.g. `touch('path.to.data'))`).

### checked

The **checked** of an `<input type="checkbox">` or `<input type="radio">` element.

### selected

The **selected** attribute on an `<option>`.

### text

The **textContent** of a typical element (including div, span, and so forth). Note
that these elements will only get change events if you send them.

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you get (and set) component properties.
*/
/* global module */
'use strict';

module.exports = function(b8r) {

return {
  value: function(element){
    let pending_value = element.dataset.pendingValue;
    if (pending_value) {
      pending_value = JSON.parse(pending_value);
      element.value = pending_value;
      if (element.value === pending_value) {
        console.log('restored pending value', element, pending_value);
        if (element.dataset.pendingValue) {
          delete element.dataset.pendingValue;
        }
      }
    }
    if(element.matches('input[type=radio]')){
      const name = element.getAttribute('name');
      const checked = b8r.find(`input[type=radio][name=${name}]`).find(elt => elt.checked);
      return checked ? checked.value : null;
    } else {
      if (element.dataset.componentId) {
        return b8r.get(`${element.dataset.componentId}.value`);
      } else {
        return element.value;
      }
    }
  },
  checked: element => element.checked,
  selected: element => element.selected,
  text: function(element){
    return element.textContent;
  },
  component: function(element, path) {
    const component_id = b8r.getComponentId(element);
    return b8r.getByPath(component_id, path);
  },
  fromMethod: function(element, path) {
    var [model, ...method] = path.split('.');
    method = method.join('.');
    return b8r.getByPath(model, method)(element);
  },
};

};
