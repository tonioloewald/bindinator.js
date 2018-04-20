/**
# toTargets
Copyright ©2016-2017 Tonio Loewald

## Binding data to the DOM

The following targets (attributes of a DOM element) can be bound to object data:

### value

    data-bind="value=message.text"

This is the value of `<input>`, `<textarea>`, and `<select>` elements.)
If attached to an `<input type="radio">` button it tries to "do the right thing".

If you bind to a **component instance**'s value it will map directly to the component's
value.

> ### Two-Way Bindings
>
> `value` is also a ["from"-binding](#source=source/b8r.fromTargets.js). which means that
> if the user changes the value of an element (that normally has a value) the change will
> automatically be picked up by b8r and the bound data updated -- per the example below.

```
<label>
  <input data-bind="value=_component_.test">
  bound to "_component_.test"
</label><br>
<label>
  <input data-bind="value=_component_.test">
  also bound to "_component_.test"
</label><br>
<label>
  <input type="number" data-bind="value=_component_.number">
  also bound to "_component_.number"
</label><br>
<label>
  <input type="range" data-bind="value=_component_.number">
  also bound to "_component_.number"
</label><br>
<script>
  set('test', 'hello, world');
  set('number', 3);
</script>
```

### text

    data-bind="text=message.sender.name"

This sets the `textContent` property of most standard elements.

Note that b8r allows you to use ES6-flavored interpolated strings on the
right-hand-side of data-bind bindings. E.g.

    data-bind="text=${message.sender.lastname}, ${message.sender.firstname}"

```
<h2 data-bind="text=_component_.message"></h2>
<script>
  set('message', 'hello, world');
</script>
```

### format

    data-bind="format=**${error.type}** ${error.detail}"

This populates the element with html that is rendered by converting markdown-style
bold or italics to tags (e.g. replacing `**bold**` or `_italic_` with `<b>bold</b>`
and `<i>italic</i>`).

*No other formatting is supported* and if the string contains a `<` or `>` character
no formatting is applied and the `textContent` of the element is set instead.
```
<h2 data-bind="format=_component_.message"></h2>
<script>
  set('message', '**hello**, world (_are you there_?)');
</script>
```

### checked

    data-bind="checked=message.private"

This is the `checked` property on `<input type="checked">` and `<input
type="radio">` elements.

```
<label>
  <input type="checkbox" data-bind="checked=_component_.checked">
  <span data-bind="text=_component_.checked"></span>
</label>
<script>
  set('checked', true);
</script>
```

### selected

    data-bind="selected=message.selected"

This is the selected attribute of `<option>` elements.

> ## Note
> `value`, `checked`, `selected`, and `text` are also "fromTargets",
> which means bindings are two-way (changes in the DOM will be copied to the
> bound object). In the case of text bindings, unless an input or change event
> occurs, bound data will not be updated.

### bytes

    data-bind="bytes=path.to.size.in.bytes"

Sets the `textContent` of element to the file size in appropriate units,
rounded to one decimal place. E.g. `600` => "600 B", `4096` => "4.0 kB". Calculations
are in binary "k" (so 1 kB === 1024 B, and so on). Annotation stops at `EB` (exabytes).

```
<input data-bind="value=_component_.number"> is <span data-bind="bytes=_component_.number"></span>
<script>
  set('number', 50000);
</script>
```

### timestamp

    data-bind="timestamp=path.to.zulu"
    data-bind="timestamp(m-d-yy)=path.to.milliseconds"

Sets the `textContent` of the element to a human readable timestamp, using
`new Date(...).localString()` by default, but supporting
[data.format](http://blog.stevenlevithan.com/archives/date-time-format)
options if supplied.

```
<span data-bind="timestamp(longDate)=_component_.timestamp"></span>
<script>
  set('timestamp', Date.now());
</script>
```

### attr()

    data-bind="attr(alt)=image.name"

This is the specified attribute. This can also be used to set "special"
properties like id, class, and style.


### prop()

    data-bind="prop(currentTime)=_component_.video.position"
    ...
    b8r.implicityHandleEventsOfType('timeupdate'); // ask b8r to intercept timeupdate events
    b8r.onAny('timeupdate', '_b8r_._update_'); // ask b8r to trigger updates on timeupdate

This is the specified element property.

### data()

    data-bind="data(imageUrl)=".image.url"

This allows you to set data attributes using camelcase. (The example shown
would set the `data-image-url` attribute.)

### style()

    data-bind="style(color)=message.textColor"
    data-bind="style(padding-left)=${message.leftPad}px"

This sets styles (via `element.style[stringValue]`) so be warned that hyphenated
properties (in CSS) become camelcase in Javascript (e.g. background-color is
backgroundColor).

The optional second parameter lets you specify *units* (such as px, %, etc.).

### class(), class_unless(), class_map()

    data-bind="class(name)=message.truthyValue"
    data-bind="class_unless(name)=message.truthyValue"

This lets you toggle a class based on a bound property.

    data-bind="class(true_class|false_class)=.message.booleanValue";

You can also provide the `class()` toTarget with a pair of classes
separated by a bar and it will assign the first if the value is truthy
and the second otherwise.

    data-bind="class_map(happy:happy-class|sad:sad-class|indifferent-class)"

```
<style>
  .happy-class:before {
    content: "😀";
  }
  .sad-class:before {
    content: "😢";
  }
  .indifferent-class:before {
    content: "😑";
  }
</style>
<label>
  <input type="checkbox" data-bind="checked=_component_.on">
  Toggle Me!
</label>
<ul>
  <li>
    icon displayed if checked:
    <span data-bind="class(icon-umbrella)=_component_.on"></span>
  </li>
  <li>
    icon displayed if NOT checked:
    <span data-bind="class_unless(icon-wrench)=_component_.on"></span>
  </li>
  <li>
    icon changes depending on checked:
    <span data-bind="class(icon-umbrella|icon-wrench)=_component_.on"></span>
  </li>
</ul>
<label>
  <span style="font-size: 32px" data-bind="class_map(
    happy:happy-class
    |sad:sad-class
    |indifferent-class
  )=_component_.emotion"></span><br>
  <select data-bind="value=_component_.emotion">
    <option>happy</option>
    <option>sad</option>
    <option>indifferent</option>
  </select>
</label>
<script>
  set('emotion', 'sad');
</script>
```

This lets you pick between two classes.

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

```
<input type="range" data-bind="value=_component_.num">
<span data-bind="method(_component_.order)=_component_.num"></span>
<script>
  const is_prime = x => {
    const max = Math.sqrt(x);
    for(let i = 2; i < max; i++) {
      if (x % i === 0) { return false; }
    }
    return true;
  }
  set('order', (elt, val) => {
    const info = [];
    info.push(val % 2 ? 'odd' : 'even');
    if (Math.floor(Math.sqrt(val)) === Math.sqrt(val)) {
      info.push('perfect square');
    }
    if (is_prime(val)) {
      info.push('prime');
    }
    elt.textContent = val + ' is ' + info.join(', ');
  });
  set('num', 1);
</script>
```

#### Passing multiple values to a bound method

You can pass an array of values to a bound method by comma-delimiting the paths, e.g.

    data-bind="nethod(path.to.method=path.to.value,path.to.other,another.path"

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
/* global require, module, console */
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

  const equals = (value_to_match, value) => {
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
  };

  const parse_options = source => {
    if (!source) {
      throw 'expected options';
    }
    return source.split('|').map(s => s.trim()).filter(s => !!s).map(s => {
      s = s.split(':').map(s => s.trim());
      return s.length === 1 ? {value: s[0]} : {match: s[0], value: s[1]};
    });
  };

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
              // console.warn('set value deferred', element, value);
            } else if (element.dataset.pendingValue) {
              delete element.dataset.pendingValue;
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
      if (content.match(/[*_]/) && !content.match(/<|>/)) {
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
    bytes: (element, value) => {
      if (!value) {
        element.textContent = '';
        return;
      }
      const suffixes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];
      let suffix = suffixes.shift();
      element.title = `${value} bytes`;
      while (value > 1024 && suffix.length) {
        value = (value / 1024).toFixed(1);
        suffix = suffixes.shift();
      }
      element.textContent = `${value} ${suffix}`;
    },
    attr: function(element, value, dest) {
      if (value === undefined || value === null || value === false) {
        element.removeAttribute(dest);
      } else {
        element.setAttribute(dest, value);
      }
    },
    prop: function(element, value, property) {
      element[property] = value;
    },
    data: function(element, value, dest) {
      if (value === undefined || value === null || value === false) {
        delete element.dataset[dest];
      } else {
        element.dataset[dest] = value;
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
      if (!class_to_toggle) {
        throw 'class toTarget requires a class to be specified';
      }
      const options = parse_options(class_to_toggle);
      element.classList.toggle(options[0].value, !!value);
      if (options.length > 1) {
        element.classList.toggle(options[1].value, !value);
      }
    },
    class_unless: function(element, value, class_to_toggle) {
      if (!class_to_toggle) {
        throw 'class_unless toTarget requires a class to be specified';
      }
      if (! value) {
        element.classList.add(class_to_toggle);
      } else {
        element.classList.remove(class_to_toggle);
      }
    },
    class_map: function(element, value, map) {
      const class_options = parse_options(map);
      let done = false;
      class_options.forEach(item => {
        if (done || (item.match && !equals(item.match, value))) {
          element.classList.remove(item.value);
        } else {
          element.classList.add(item.value);
          done = true;
        }
      });
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
      let [model, ...method] = dest.split('.');
      method = method.join('.');
      if (model === '_component_') {
        model = get_component_with_method(element, method);
      }
      if (model) {
        b8r.callMethod(model, method, element, value);
      } else if (element.closest('body')) {
        console.warn(`method ${method} not found in`, element);
      }
    },
    timestamp: function(element, zulu, format) {
      if (!zulu) {
        element.textContent = '';
      } else if (!format) {
        const date = new Date(zulu);
        element.textContent = date.toLocaleString();
      } else {
        require.lazy('../third-party/date.format.js').then(() => {
          const date = new Date(zulu);
          element.textContent = date.format(format);
        });
      }
    },
    json: function(element, value) {
      element.textContent = JSON.stringify(value, false, 2);
    },
    data_path: function(element, value) {
      if (!element.dataset.path || value && element.dataset.path.substr(-value.length) !== value) {
        element.dataset.path = value;
        b8r.bindAll(element);
      }
    },
    component: function(element, value, dest) {
      const component_id = b8r.getComponentId(element);
      b8r.setByPath(component_id, dest, value);
    },
    component_map: function(element, value, map) {
      const component_options = parse_options(map);
      const option = component_options.find(item => !item.match || item.match == value);
      if (option) {
        const component_name = option.value;
        const existing = element.dataset.componentId || '';
        if (existing.indexOf(`c#${component_name}#`) === -1) {
          b8r.removeComponent(element);
          b8r.insertComponent(component_name, element);
        }
      }
    }
  };
};
