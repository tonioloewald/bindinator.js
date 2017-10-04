/**
# toTargets
Copyright ©2016-2017 Tonio Loewald

## Flushing data to the DOM

The following targets (attributes of a DOM element) can be bound to object data:

### value

    data-bind="value=message.text"

This is the value of `<input>` and `<textarea>` elements.) If attached to a radio button
it tries to "do the right thing".

If you bind to a **component instance**'s value it will map directly to the component's
value.

### checked

    data-bind="checked=message.private"

This is the checked property on `<input type="checked">` and `<input
type="radio">` elements.

### selected

    data-bind="selected=message.selected"

This is the selected attribute of `<option>` elements.

### text

    data-bind="text=message.sender.name"

This sets the textContent property of most standard elements.

Note that b8r allows you to use ES6-flavored interpolated strings on the
right-hand-side of data-bind bindings. E.g.

    data-bind="text=${message.sender.lastname}, ${message.sender.firstname}"

### format

    data-bind="format=**${error.type}** ${error.detail}"

This sets the content of an element with the value supplied by honoring
a markdown-style bold or italics (e.g. replacing `**bold**` or `_italic_`
with `<b>bold</b>` and `<i>italic</i>`).

*No other formatting is supported* and if the string contains a '>' character
no formatting is applied and the `textContent` of the element is set instead.

> ## Note
> `value`, `checked`, `selected`, and `text` are also "fromTargets",
> which means bindings are two-way (changes in the DOM will be copied to the
> bound object). In the case of text bindings, unless an input or change event
> occurs, bound data will not be updated.

### attr()

    data-bind="attr(alt)=image.name"

This is the specified attribute. This can also be used to set "special"
properties like id, class, and style.

### style()

    data-bind="style(color)=message.textColor"
    data-bind="style(padding-left)=${message.leftPad}px"

This sets styles (via `element.style[stringValue]`) so be warned that hyphenated
properties (in CSS) become camelcase in Javascript (e.g. background-color is
backgroundColor).

The optional second parameter lets you specify *units* (such as px, %, etc.).

### class()

    data-bind="class(name)=message.truthyValue"

This lets you toggle a class based on a bound property.

### `show_if`, `show_if()`, `hide_if`, `hide_if()`

    data-bind="hide_if(_undefined_)=message.priority"


### `enabled_if`, `enabled_if()`, `disabled_if`, `disabled_if()`

    data-bind="enabled_if=_data_.editable"

This shows (or hides) an element based on whether a bound value is truthy or
matches the provided parameter.

### method()

    data-bind="method(model.notify)=message.priority"

Calls the specified method, passing it the bound value. The method will receive
the element, value, and data source as parameters. (This means that methods
registered as event handlers will need to deal with being passed a naked element
instead of an event)

### `component_map()`

    data-bind="component-map(
        value:component_name|
        other_value:other_name|
        default_component
    )=message.type"

This allows a component to be bound dynamically based on a property. (The bound value
will be assigned to the component's private data.)

### json

    data-bind="json=path.to.object"

Dumps a nicely formatted stringified object in an element (for debugging
purposes);

### `pointer_events_if`, `pointer_events_off_if`

    data-bind="pointer_events_if=path.to.enabled"

Sets the style rule pointer-events to 'none' as appropriate (very simple way of disabling
the content of an element)

### component

    data-bind="component(options)=path.to.options"

The `component` target lets you set (and get) component properties.

## Comparison Values

These terms are used for comparison to certain values in conditional toTargets.

* `_true_`
* `_false_`
* `_undefined_`
* `_null_`
*/
/* jshint expr: true */
/* global require, module */
'use strict';

module.exports = function(b8r) {

  const img = require('./b8r.imgSrc.js');
  const {get_component_with_method} = require('./b8r.events.js');

  const special_values = {
    '_true_': true,
    '_false_': false,
    '_undefined_': undefined,
    '_null_': null,
  };

  function equals(value_to_match, value) {
    if (typeof value === 'string') {
      value = value.replace(/\&nbsp;/g, '').trim();
    }
    if (special_values.hasOwnProperty(value_to_match)) {
      return value === special_values[value_to_match];
    } else if (value_to_match !== undefined) {
      return value == value_to_match;
    } else {
      return !!value;
    }
  }

  return {
    value: function(element, value) {
      switch (element.getAttribute('type')) {
        case 'radio':
          if (element.checked !== (element.value == value)) {
            element.checked = element.value == value;
          }
          break;
        case 'checkbox':
          element.checked = value;
          break;
        default:
          if (element.value !== undefined) {
            element.value = value;
            // <select> element will not take value if no matching option exists
            if (value && !element.value) {
              element.dataset.pendingValue = JSON.stringify(value);
              console.warn('could not set value', element, value);
            } else {
              if (element.dataset.value) {
                delete element.dataset.value;
              }
            }
          } else {
            if (element.dataset.componentId) {
              b8r.set(`${element.dataset.componentId}.value`, value);
            } else {
              console.error('could not set component value', element, value);
            }
          }
      }
    },
    checked: (element, value) => element.checked = !!value,
    selected: (element, value) => {
      element.selected = !!value;
    },
    text: (element, value) => element.textContent = value,
    format: (element, value) => {
      let content = value || '';
      if (typeof content !== 'string') {
        throw 'format only accepts strings or falsy values';
      }
      let template = false;
      if (content.match(/[*_]/) && !content.match('>')) {
        template = true;
        content = content.replace(/[*_]{2,2}(.*?)[*_]{2,2}/g, '<b>$1</b>')
                                   .replace(/[*_](.*?)[*_]/g, '<i>$1</i>');
      }
      if(content.indexOf('${') > -1){
        content = b8r.interpolate(content, element);
      }
      if (template) {
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    },
    fixed: (element, value, dest) => element.textContent = parseFloat(value).toFixed(dest || 1),
    attr: function(element, value, dest) {
      if (value === undefined || value === null) {
        element.removeAttribute(dest);
      } else {
        element.setAttribute(dest, value);
      }
    },
    img,
    bgImg: (element, value) => {
      if (value) {
        element.style.backgroundImage = `url("${value}")`;
      } else {
        element.style.backgroundImage = '';
      }
    },
    style: function(element, value, dest) {
      if (!dest) {
        if (typeof value === 'string') {
          element.setAttribute('style', dest);
        } else if (typeof value === 'object') {
          Object.assign(element.style, value);
        }
      } else if (value !== undefined) {
        element.style[dest] = value;
      }
    },
    class: function(element, value, class_to_toggle) {
      if (class_to_toggle) {
        if (value) {
          element.classList.add(class_to_toggle);
        } else {
          element.classList.remove(class_to_toggle);
        }
      } else {
        element.setAttribute('class', value);
      }
    },
    contenteditable: function(element, value, dest) {
      if (equals(dest, value)) {
        element.setAttribute('contenteditable', true);
      } else {
        element.removeAttribute('contenteditable');
      }
    },
    enabled_if: function(element, value, dest) {
      if(equals(dest, value)) {
        b8r.enable(element);
      } else {
        b8r.disable(element);
      }
    },
    disabled_if: function(element, value, dest) {
      if(!equals(dest, value)) {
        b8r.enable(element);
      } else {
        b8r.disable(element);
      }
    },
    pointer_events_if: function (element, value) {
      element.style.pointerEvents = value ? 'auto' : 'none';
    },
    pointer_events_off_if: function (element, value) {
      element.style.pointerEvents = !value ? 'auto' : 'none';
    },
    show_if: function(element, value, dest) {
      equals(dest, value) ? b8r.show(element) : b8r.hide(element);
    },
    hide_if: function(element, value, dest) {
      equals(dest, value) ? b8r.hide(element) : b8r.show(element);
    },
    method: function(element, value, dest) {
      var [model, ...method] = dest.split('.');
      method = method.join('.');
      if (model === '_component_') {
        model = get_component_with_method(element, method);
      }
      b8r.callMethod(model, method, element, value);
    },
    json: function(element, value) {
      element.textContent = JSON.stringify(value, false, 2);
    },
    component: function(element, value, dest) {
      const component_id = b8r.getComponentId(element);
      b8r.setByPath(component_id, dest, value);
    },
    component_map: function(element, value, dest) {
      var component_options = dest.split('|');
      var component_name;
      for (var i = 0; i < component_options.length; i++) {
        var parts = component_options[i].split(':').map(s => s.trim());
        if (parts.length === 1 || parts[0] == value) {
          component_name = parts.pop();
          break;
        }
      }
      if (component_name) {
        const existing = element.dataset.componentId || '';
        if (existing.indexOf(`c#${component_name}#`) === -1) {
          b8r.insertComponent(component_name, element);
        }
      }
    }
  };
};
