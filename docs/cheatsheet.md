# `b8r` cheatsheet

## App Structure

Setting aside all the cruft we *should* put in a web page, this is basically
all you need:

```
<title>minimal</title>
<b8r-component path="path/to/root-component.js"></b8r-component>
<script type="module">
  import b8r from 'path/to/b8r.js'
</script>
```

## Data-Binding

Simple, common case:

```
<input data-bind="value=path.to.string">
```

Two data-bindings on one element (semicolons can be used instead of line breaks)

```
<button data-bind="
  enabled_if=path.to.buttonEnabled
  text=path.to.buttonTitle
"></button>
```

Two targets bound to one value

```
<div data-bind="
  attr(title),text=path.to.buttonTitle
"></button>
```

### To vs. From

- **to** means a binding updates the DOM based on registered values.
- **from** means the registered value is updated if the DOM is modified by user actions that trigger `change` events.

|| target || key || from? || description  
| value | | yes | binds the `value` (but does what you'd hope for with `&lt;input type="radio">` |
| checked | | yes | binds the `checked` of `&lt;input type="checkbox">`, supports ternary checkboxes |
| selected | | `*` | sets/removes the `selected` attribute of &lt;option&gt; based on the truthiness of the bound value |
| text | | `*` | sets `textContent` to bound value, allows template-string like binding, e.g. `data-bind="text=${user.firstName} ${lastName}"`. If you want to embed such bindings in an actual template string, use `$\{ ... }` |
| format | | | sets element's content to value formatted with Markdown-style character styles, e.g. `**bold**` and `_italic_` |
| bytes | | | sets the textContent to a human-friendly string for the number of bytes, e.g. `1024` is rendered as `"1kB"` |
| timestamp | format string | | renders UNIX timestamp values as `.localeString()` or using the provided format string with `dateFormat()` https://blog.stevenlevithan.com/archives/date-time-format. |
| json | | | binds `JSON.stringify(boundValue, false, 2)` (this is mainly for debugging) |
| enabled&#95;if disabled&#95;if | needle | | sets `disabled` attribute based on the truthiness of the bound value or, if provided, whether it matches the needle |
| pointer&#95;events&#95;if pointer&#95;events&#95;off&#95;if | | | sets `pointer-events: none` based on the truthiness of the bound value |
| path.to.method method(path.to.method) | | `*` | uses function at path as custom binding. The method is passed the `element` and bound value(s). Multiple bound values will be passed as an array. If expected to function as a `from` binding, function should return the element's (single) value |
| attr | attribute name | | binds the specified attribute |
| prop | property name | | binds the specified property |
| data | camelCase | | sets attribute `data-camel-case` to the boundValue |
| style | property&vert;units | | sets the inline style property (adding units, if provided), e.g. `style(width|px)=path.to.twoHundred` will set `style="width: 200px"` |
| show&#95;if hide&#95;if show&#95;unless hide&#95;unless | string | | shows/hides the element based on the truthiness of the bound value or, if provided, the string. |
| img | | | sets the `src` of an `&lt;img>`, with preloading |
| bgImg | | | sets the `background-image` style property |
| class class&#95;if class&#95;unless | className | | toggles the specified class based on the truthiness of the bound value |
| class&#95;map | string:className&vert; otherString:otherClass&vert; defaultClass | | toggles classes based on the bound value |
| component | path.to.value | | sets the specified value of the component |
| component&#95;map | string:name&vert; otherString:otherName&vert; defaultName | | inserts a component by name based on the bound value |

### Notes

`*` from binding works, but only if a `change` event is triggered, which likely won't happen unless you do it.

`needle` values support some special strings for common _exact_ matches

```
_true_
_false_
_undefined_
_null_
_empty_
```

## Array-Binding

A basic array binding (providing an `idPath` is optional, but strongly recommended. If the array contains objects, you can use `_auto_` and be happy).

```
<ul>
	<li data-list="path.to.array:idPath">
		<span data-bind="text=.someProp"></span>
	</li>
</ul>
```

### Filtering &amp; Sorting

Typically, you may want to filter or sort a bound array:

```
<table>
	<tbody>
		<tr data-list="path.to.filterSort(path.to.array,path.to.option):idPath">
			<td data-bind="text=.someProp"></td>
		</tr>
	</tbody>
</table>
```

When the array is bound or changes it will be passed through `filterSort` which will receive the bound parameters, the first of which is expected to be the source array (`b8r` will complain if the elements of the output array are not elements of the source array).

Because `b8r` automatically updates bound elements based on changes to registered values, changing any of the parameters will queue the list for re-rendering.

## Event-Binding

```
<button data-event="click:path.to.handler"></button>
```

Multiple events can trigger a single handler.

```
<button data-event="mouseup,touchend:path.to.handler"></button>
```

The handler will be passed the event and the bound element as parameters.

### Events `b8r` handles by default

#### Mouse Events

```
mousedown, mouseup, click, dblclick, contextmenu
mouseleave, mouseenter, mousemove, mouseover, mouseout
mousewheel, scroll
```

#### User Input

```
keydown, keyup
input, change
cut, copy, paste
focus, blur, focusin, focusout
```

#### Drag Events

```
dragstart, dragenter, dragover, dragleave, dragend, drop
```

#### CSS Animations

```
transitionend, animationend
```

To get `b8r` to implicitly handle other types of event, use

```
b8r.implicitlyHandleEventsOfType('type')
```

### Intercepting Events

If you want to handle an event **before** anything in the DOM gets to "see" it (and possibly prevent it from firing) you can use `b8r.onAny` (and, very importantly, use `offAny` when you're done). If you do this, it's important to remember that event handlers that do not return `true` will stop propagating.

> Why does this exist? To implement support for user actions that move across the hierarchy, such as resizing things or drag-and-drop, you often need to intercept the events before they trigger the usual effects).

`b8r.onAny()` returns a magic `handlerRef` which you can pass to `b8r.offAny()` to surgically remove it.

`b8r.anyListeners()` returns a list of all such `handlerRefs`.

## Components

Create a template as an ES6 module thus:

```
export default {
  css: `
    ._component_ > div { color: yellow }
  `,
  html: `
    <div>
      this text will be yellow
    </div>
  `,
  async initialValue({
    // only destructure the items you need
    component,           // this is the element that the component is inserted into
    b8r,                 // it's b8r!
    find,                // b8r.findWithin(component, ...)
    findOne,             // b8r.findOneWithin(component, ...)
    get,                 // get (within the component's private data)
    set,                 // set (within the component's private data)
    on,                  // b8r.on(component, ...)
    touch                // refresh the component
  }){
    // your setup code here
    return {
      // initial state of component
    }
  },
  async load({
    // only destructure the items you need
    component,           // this is the element that the component is inserted into
    b8r,                 // it's b8r!
    find,                // b8r.findWithin(component, ...)
    findOne,             // b8r.findOneWithin(component, ...)
    data,                // data is a proxy of the component's private data
    get,                 // get (within the component's private data)
    set,                 // set (within the component's private data)
    on,                  // b8r.on(component, ...)
    touch                // refresh the component
  }){
    // your javascript goes here
  },
}
```

Creating components inline:

```
b8r.makeComponent('name', {
	...
})
```

A component loaded from `path/to/foo.js` will automatically be named `foo`. If you need to change a component's name

Embed the component using the `<b8r-component>` custom-element.

```
<b8r-component path="path/to/module"></b8r-component>
```

Once loaded, a component will have a `data-component-id` property that is the name of its private data in the `b8r` **registry**.

Manual loading/preloading:

```
b8r.component('path/to/component.js') // loads the component
b8r.insertComponent('name', element) // loads the component into the target element
b8r.componentOnce('name') // makes sure there's exactly one of the named component in the DOM
```

### Composition

If the `<b8r-component>` element has content, when the component "hydrates" it will be moved to the element within the the loaded component that has a `data-children` attribute (if any).
