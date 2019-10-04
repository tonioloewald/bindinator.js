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

These aren't true ES6 interpolated strings (you can't just stick code in them)
because one of b8r's design goals is not to create new places to hide complex
code. If you want complexity, put it in your code.

**But** there is one thing you can do with b8r's interpolated strings you can't
do in regular javascript, which is nest references, e.g.

    data-bind="text=hello ${path.to.list[id=${path.to.user.id}].name}"

`b8r.interplate` will perform substitutions from the inside out (so inner
references are resolved first).

Note that once you have any interpolated value in the right-hand-side of a data-bind
then the whole thing is interpolated, so **this will not work**:

    data-bind="text=path.to.list[id=${path.to.user.id}].name" // will render "path.to.list[id=17]"

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
no formatting is applied and the `textContent` of the element is set instead (a
precaution against script injection).
```
<h2 data-bind="format=_component_.message"></h2>
<script>
  set('message', '**hello**, world (_are you there_?)');
</script>
```

### checked

    data-bind="checked=message.private"

This is the `checked` property on `<input type="checked">` and `<input
type="radio">` elements. The `checked` to and from targets support the
[indeterminate state on checkboxes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox)
via `null` (not `undefined`).

```
<style>
  ._component_ label { display: block; }
</style>
<label>
  <input type="checkbox" data-bind="checked=_component_.first">
  <span data-bind="json=_component_.first"></span>
</label>
<label>
  <input type="checkbox" data-bind="checked=_component_.second">
  <span data-bind="json=_component_.second"></span>
</label>
<label>
  <input type="checkbox" data-bind="checked=_component_.third">
  <span data-bind="json=_component_.third"></span>
</label>
<script>
  set({
    first: true,
    second: false,
    third: null,
  })
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
    b8r.implicitlyHandleEventsOfType('timeupdate'); // ask b8r to intercept timeupdate events
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

### class(), class\_unless(), class\_map()

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

### show\_if, show\_if(), hide\_if, hide\_if()

    data-bind="hide_if(_undefined_)=message.priority"

### enabled\_if, enabled\_if(), disabled\_if, disabled\_if()

    data-bind="enabled_if=path.to.editable"

This shows (or hides) an element based on whether a bound value is truthy or
matches the provided parameter.

### img

    <img data-bind="img=path.to.imageUrl">

The `<img>` element will have its src attribute set after the image has been preloaded
(and it will fade in). Leverage's b8r's [imgSrc library](#source=source/b8r.imgSrc.js)

**Note**: This can cause problems with cross-domain policies. If you just want to set the src
to the specified string, you can use a simple `attr()` binding:

    <img data-bind="attr(src)=path.to.imageUrl"

### bgImg

    <div data-bind="bgImg=path.to.imageUrl">...</div>

The `<div>` will have its style.backgroundImage set to `url(the-path-provided)` or
nothing (if the path is falsey).

### method()

    data-bind="method(model.notify)=message.priority"

Calls the specified method, passing it the bound value. The method will receive
the **element**, **value**, and **data source** as parameters. (This means that methods
also registered as event handlers will need to deal with being passed a naked
element instead of an event).

```
<input type="range" data-bind="value=_component_.num">
<span data-bind="method(_component_.order)=_component_.num"></span>
<script>
  const is_prime = x => {
    const max = Math.sqrt(x);
    for(let i = 2; i < max; i++) {
      if (x % i === 0) { return false; }
    }
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

You can pass an multiple values to a bound method by comma-delimiting the paths, e.g.

    data-bind="method(path.to.method)=path.to.value,path.to.other,another.path"

In this case, the **value** passed to the method will be an array of values
corresponding to the paths.

```
<style>
  pre {
    lineheight: 1
  }
</style>
<pre>
<input data-bind="value=_component_.a">+
<input data-bind="value=_component_.b">=
<span data-bind="method(_component_.sum)=_component_.a,_component_.b"></span>
</pre>
<script>
  set({
    a: 17,
    b: Math.PI,
    sum: (elt, values) => elt.textContent = values.reduce((a, b) => a + parseFloat(b), 0)
  })
</script>
```

### component\_map()

    data-bind="component_map(
        value:componentName|
        other_value:other_name|
        default_component
    )=message.type"

This allows a component to be bound dynamically based on a property. (The bound value
will be assigned to the component's private data.)

### json

    data-bind="json=path.to.object"

Dumps a nicely formatted stringified object in an element (for debugging
purposes);

### pointer\_events\_if, pointer\_events\_off\_if

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
* `_empty_`
*/
/* jshint expr: true */
/* global console, HTMLSelectElement */

import { imgSrc } from './b8r.imgSrc.js'
import { getComponentWithMethod } from './b8r.events.js'
import describe from './describe.js'
import '../third-party/date.format.js'

export default function (b8r) {
  const specialValues = {
    _true_: v => v === true,
    _false_: v => v === false,
    _undefined_: v => v === undefined,
    _null_: v => v === null,
    _empty_: v => typeof v === 'string' && !!v.trim()
  }

  const equals = (valueToMatch, value) => {
    if (typeof value === 'string') {
      value = value.replace(/&nbsp;/g, '').trim()
    }
    if (specialValues.hasOwnProperty(valueToMatch)) {
      return specialValues[valueToMatch](value)
    } else if (valueToMatch !== undefined) {
      return value == valueToMatch // eslint-disable-line eqeqeq
    } else {
      return !!value
    }
  }

  const parseOptions = source => {
    if (!source) {
      throw new Error('expected options')
    }
    return source.split('|').map(s => s.trim()).filter(s => !!s).map(s => {
      s = s.split(':').map(s => s.trim())
      return s.length === 1 ? { value: s[0] } : { match: s[0], value: s[1] }
    })
  }

  return {
    value: function (element, value) {
      if (element.dataset.type === 'number') value = parseFloat(value)
      switch (element.getAttribute('type')) {
        case 'radio':
          if (element.checked !== (element.value == value)) { // eslint-disable-line eqeqeq
            element.checked = element.value == value // eslint-disable-line eqeqeq
          }
          break
        case 'checkbox':
          element.checked = value
          break
        default:
          if (element.dataset.componentId) {
            b8r.set(`${element.dataset.componentId}.value`, value)
          } else if (element.value !== undefined) {
            element.value = value
            // <select> element will not take value if no matching option exists
            if (element instanceof HTMLSelectElement) {
              if (value && !element.value) {
                element.dataset.pendingValue = JSON.stringify(value)
              } else if (element.dataset.pendingValue) {
                delete element.dataset.pendingValue
              }
            }
          } else {
            // <b8r-component> does not support value if it does
            // not have a loaded component
            if (!element.tagName.includes('-')) {
              console.error('could not set component value', element, value)
            }
          }
      }
    },
    checked: (element, value) => {
      if (value === null) {
        element.checked = false
        element.indeterminate = true
      } else {
        element.checked = !!value
      }
    },
    selected: (element, value) => {
      element.selected = !!value
    },
    text: (element, value) => {
      element.textContent = value
    },
    format: (element, value) => {
      let content = value || ''
      if (typeof content !== 'string') {
        throw new Error('format only accepts strings or falsy values')
      }
      let template = false
      if (content.match(/[*_]/) && !content.match(/<|>/)) {
        template = true
        content = content.replace(/[*_]{2,2}(.*?)[*_]{2,2}/g, '<b>$1</b>')
          .replace(/[*_](.*?)[*_]/g, '<i>$1</i>')
      }
      if (content.indexOf('${') > -1) {
        content = b8r.interpolate(content, element)
      }
      if (template) {
        element.innerHTML = content
      } else {
        element.textContent = content
      }
    },
    fixed: (element, value, dest) => {
      element.textContent = parseFloat(value).toFixed(dest || 1)
    },
    bytes: (element, value) => {
      if (!value) {
        element.textContent = ''
        return
      }
      const suffixes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB']
      let suffix = suffixes.shift()
      element.title = `${value} bytes`
      while (value > 1024 && suffix.length) {
        value = (value / 1024).toFixed(1)
        suffix = suffixes.shift()
      }
      element.textContent = `${value} ${suffix}`
    },
    attr: function (element, value, dest) {
      if (value === undefined || value === null || value === false) {
        element.removeAttribute(dest)
      } else {
        element.setAttribute(dest, value)
      }
    },
    prop: function (element, value, property) {
      element[property] = value
    },
    data: function (element, value, dest) {
      if (value === undefined || value === null || value === false) {
        delete element.dataset[dest]
      } else {
        element.dataset[dest] = value
      }
    },
    img: imgSrc,
    bgImg: (element, value) => {
      if (value) {
        element.style.backgroundImage = `url("${value}")`
      } else {
        element.style.backgroundImage = ''
      }
    },
    style: function (element, value, dest) {
      if (!dest) {
        if (typeof value === 'string') {
          element.setAttribute('style', dest)
        } else if (typeof value === 'object') {
          Object.assign(element.style, value)
        }
      } else if (value !== undefined) {
        element.style[dest] = value
      }
    },
    class: function (element, value, classToToggle) {
      if (!classToToggle) {
        throw new Error('class toTarget requires a class to be specified')
      }
      const options = parseOptions(classToToggle)
      element.classList.toggle(options[0].value, !!value)
      if (options.length > 1) {
        element.classList.toggle(options[1].value, !value)
      }
    },
    class_unless: function (element, value, classToToggle) {
      if (!classToToggle) {
        throw new Error('class_unless toTarget requires a class to be specified')
      }
      if (!value) {
        element.classList.add(classToToggle)
      } else {
        element.classList.remove(classToToggle)
      }
    },
    class_map: function (element, value, map) {
      const classOptions = parseOptions(map)
      let done = false
      classOptions.forEach(item => {
        if (done || (item.match && !equals(item.match, value))) {
          element.classList.remove(item.value)
        } else {
          element.classList.add(item.value)
          done = true
        }
      })
    },
    contenteditable: function (element, value, dest) {
      if (equals(dest, value)) {
        element.setAttribute('contenteditable', true)
      } else {
        element.removeAttribute('contenteditable')
      }
    },
    enabled_if: function (element, value, dest) {
      if (equals(dest, value)) {
        b8r.enable(element)
      } else {
        b8r.disable(element)
      }
    },
    disabled_if: function (element, value, dest) {
      if (!equals(dest, value)) {
        b8r.enable(element)
      } else {
        b8r.disable(element)
      }
    },
    pointer_events_if: function (element, value) {
      element.style.pointerEvents = value ? 'auto' : 'none'
    },
    pointer_events_off_if: function (element, value) {
      element.style.pointerEvents = !value ? 'auto' : 'none'
    },
    show_if: function (element, value, dest) {
      equals(dest, value) ? b8r.show(element) : b8r.hide(element)
    },
    hide_if: function (element, value, dest) {
      equals(dest, value) ? b8r.hide(element) : b8r.show(element)
    },
    method: function (element, value, dest) {
      let [model, ...method] = dest.split('.')
      method = method.join('.')
      if (model === '_component_') {
        model = getComponentWithMethod(element, method)
      }
      if (model) {
        b8r.callMethod(model, method, element, value)
      } else if (element.closest('body')) {
        console.warn(`method ${method} not found in`, element)
      }
    },
    timestamp: function (element, zulu, format) {
      if (!zulu) {
        element.textContent = ''
      } else if (!format) {
        const date = new Date(zulu)
        element.textContent = date.toLocaleString()
      } else {
        const date = new Date(zulu)
        element.textContent = date.format(format)
      }
    },
    json: function (element, value) {
      try {
        element.textContent = JSON.stringify(value, false, 2)
      } catch (_) {
        const obj = {}
        Object.keys(value).forEach(key => {
          obj[key] = describe(value[key])
        })
        element.textContent = '/* partial data -- could not stringify */\n' + JSON.stringify(obj, false, 2)
      }
    },
    data_path: function (element, value) {
      if (!element.dataset.path || (value && element.dataset.path.substr(-value.length) !== value)) {
        element.dataset.path = value
        b8r.bindAll(element)
      }
    },
    component: function (element, value, dest) {
      const componentId = b8r.getComponentId(element)
      b8r.setByPath(componentId, dest, value)
    },
    component_map: function (element, value, map) {
      const componentOptions = parseOptions(map)
      const option = componentOptions.find(item => !item.match || item.match == value) // eslint-disable-line eqeqeq
      if (option) {
        const componentName = option.value
        const existing = element.dataset.componentId || ''
        if (existing.indexOf(`c#${componentName}#`) === -1) {
          b8r.removeComponent(element)
          b8r.insertComponent(componentName, element)
        }
      }
    }
  }
};
