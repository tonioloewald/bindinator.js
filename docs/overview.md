# b8r overview

`b8r` is a lightweight framework written entirely in modern vanilla Javascript that lets you 
build web applications out of reusable, composable components (including web-components),
and providing robust state management. 

Unlike similarly capable frameworks, it doesn't require transpilation, domain-specific languages, 
templating languages, boilerplate, or pretty much anything else. On the other hand, it plays
nicely with most third-party libraries, including legacy libraries that expect to be imported
by tag.

<b8r-component name="fiddle" data-source="./components/todo-simple.js"></b8r-component>

The preceding example is a self-contained reusable component implemented as an ES6 module.

## paths

*The* central idea in `b8r` is of binding **things** (dom elements, events, values) to **paths**.

```
<input data-bind="value=path.to.value">
<button data-event="click:path.to.function">Click Me</button>
```

The `<input>`'s `value` is bound to the path `path.to.value` by a standard HTML attribute.

The `<button>`'s `click` event is bound to the path `path.to.fn` similarly.

A **path** serves as the cut-out between a logical address and a concrete value, allowing view elements and
the data you intend to populate them or the events you intend them to trigger to be decoupled cleanly.

Paths mostly look like javascript object references (e.g. `foo.bar`) by intention, with the
key additional feature of supporting **id-paths** to specify items in arrays of objects
more precisely than by their index, e.g.

```
b8r.set('foo', [{bar: 11}, {bar: 16}])
b8r.get('foo[bar=16]') // will get you the second element of the array
```

When you `set` a value (functions are values) at a path, the binding does the work. So, if you
were to `b8r.set({path: {to: {value: 17, fn(){ alert('hello')}}}})`, it would *just work*.
That's the central concept — but there are lots of useful details to handle binding arrays,
composing components, and handling updates.

To give you one pithy example, `b8r`'s bindings work "both ways" for DOM properties that can
be directly changed by the user, e.g. the `value` of an `<input>`. `b8r` handles the corner
cases (e.g. if multiple elements are bound to the same value, `b8r` doesn't update the element
that is the source of a change).

## register, set, get, and replace — binding data to names

You bind values to names by **registering** objects to root **names**.

```
b8r.register('root', { test: 17 });
```

You can now *retrieve* the value 17 by using its **path** which is `root.test`.

```
b8r.get('root.test') // 17
```

You can *update* the value at the path:

```
b8r.set('root.test', Math.PI)
```

And you can *replace* an object inside the registry using `replace`:

```
b8r.set('root.infinity', Infinity)  // b8r.get('root.test') is still Math.PI
b8r.replace('root', {bar: 'baz'})   // b8r.get('root.test') and b8r.get('root.infinity') are gone
```

### register, set, and get — inside a component

Within a component's `initialValue` or `load` methods you have access to `get`, and `set`
which are local to the component.

```
export default = {
  ...
  load({get, set}) {
    set('foo', 17)   // equivalent of b8r.set('<component-id>.foo', 17)
    get('foo')       // 17
  }
}
```

### touch

Sometimes you simply need to make changes directly. It might be for efficiency or convenience. Also, if
you change the order of elements in an array, there may be no other way around it.

In such cases you can simply tell `b8r` that you've changed something by calling `touch` on the path containing
the changes. E.g.

```
const bigArray = b8r.get('app.bigArray')
bigArray.sort(complexSortingFunction)
b8r.touch('app.bigArray')
```

### paths for array items

You can reference array items via **index**. This looks like an ordinary javascript array reference (e.g. `path.to.array[17]`):

```
b8r.set('root.list', [{name: 'Juanita'}, {name: 'Mahatma'}]);
b8r.get('root.list[0]') // {name: 'Juanita'}
b8r.get('root.list[1].name') // 'Mahatma'
```

You can also reference array item using an **id-path**, which compares a path within the item to a (stringified) value (e.g. `path.to.array[id=17]`:

```
b8r.set('root.list', [{id: 123, name: 'Juanita'}, {id: 456, name: 'Mahatma'}]);
b8r.get('root.list[id=123]') // {name: 'Juanita'}
b8r.get('root.list[id=456].name') // 'Mahatma'
b8r.get('root.list[name=Mahatma].id)') // 456
```

## binding data to DOM elements with `data-bind`

You bind data to the DOM by:

- Binding **data** to a **path**
- Binding the **path** to a DOM element **target** using the `data-bind` attribute.

The general form is `data-bind="target=path.to.data"`.

Note that it doesn't matter whether you insert DOM elements (presumably within
components) before you bind the data to the path or vice versa! 
b8r is designed for an async world!

<b8r-component name="fiddle">
example.appendChild(
  b8r.elements.input({bindValue: 'data-binding-example.text'})
)
b8r.reg['data-binding-example'] = {text: 'edit this text'}
</b8r-component>

## binding methods to events with `data-event`

You bind an event to a method by:

- Binding a **method**  to a **path**.
- Binding the **path** to a DOM element **event** using the `data-event` attribute.

The general form is `data-event="event_type:path.to.method`.

When the event occurs the method is called and passed the event and the element.

<b8r-component name="fiddle">
example.appendChild(
  b8r.elements.button(
    'Click me!', {
      onClick: 'event-binding-example.click'
    }
  )
)
b8r.reg['event-binding-example'] = {
  click(){
    alert('OMG a click!')
  }
}
</b8r-component>

Again, it's not important if the event is triggered (slightly) before the handler has been bound to the path. You can bind a path to an event and then bind the method later (e.g. when the code for it becomes available). In fact, if the user clicks the button before the method has been bound to the path, it will call the method when it becomes available.

## binding lists with `data-list`

Arrays are bound to the DOM by:

- Creating a **template** for the **array element** and binding it to a **path**
- Binding an **array** to the **path**

The general form is `data-list="path.to.array"` or, optionally `data-list="path.to.array:path.to.id"` (usually, the id-path is pretty simple, e.g. `id`). Using id-paths allows for more efficient list updates.

<b8r-component name="fiddle">
example.append(
  b8r.elements.div({
    bindList: 'list-example.array', 
    bindText: '.name'
  })
)
b8r.reg['list-example'] = {
  array: [{name: 'Reginald'}, {name: 'Roger'}, {name: 'Brian'}]
}
</b8r-component>

Within the list template, you can use **relative paths** (e.g. `.name`) which reference paths within the list element.

The relative path `.` is treated by `b8r` as referring to the entire list item, which is especially useful for
binding arrays of bare values (e.g. arrays of strings or numbers)

<b8r-component name="fiddle">
example.append(
  b8r.elements.div({
    bindList: 'simple-list-example.array', 
    bindText: '.'
  })
)
b8r.register('simple-list-example', {
  array: ['a', 'simple', 'array', 17, Math.PI]
})
</b8r-component>

## components

[b8r components](/?source=docs/components.md) are self-contained reusable, composable views. 

Typically, a component is defined in a single javascript file and exported
as an object: 

```
/**
# Example Component

You can use markdown to format the docs.
*/

export default = {
  css: `._component_ > label > span {
    color: yellow;
  }`,
  view(elements) {
    return elements.label(
      elements.span('Enter some text'),
      elements.input({ bindValue: '_component_.text'})
    )
  },
  initialValue(context) {
    context.set({
      text: 'edit this'
    })
  }
}
```

### loading components with `<b8r-component>`

The easiest way to insert a `b8r` component is to use a `<b8r-component>` custom element.

If you inspect the DOM, you can see how the clock below has been embedded:

<b8r-component name="fiddle" data-source="components/analog-clock.component.js"></b8r-component>

You can use a component by `path` (which automatically loads the component if necessary) or
by `name` if a component is already (or will be) loaded (typically using `b8r.component('path/to/component.js)`)

If you want to bundle compnents then `import` them and use `b8r.makeComponent` to register them with a given name.

```
import someComponent from 'path/to/some-component.js'
b8r.makeComponent('some-component', someComponent)
```

And then insert instances of that component by name:

```
<b8r-component name="some-component"></b8r-component>
```

Note that order is not important, and you can insert the element any way you like (e.g. by creating
the `<b8r-component>` element directly and inserting it into the DOM).

If you're not trying to package your app using WebPack or rollup and aren't worried about
[content security policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP), you can simply load 
the component directly from a `path`:

```
<b8r-component path="path/to/some-component.js"></b8r-component>
```

Here's the [color-picker](?source=components/color-picker.js) component loaded inline using the preceding method:

<b8r-component path="../components/color-picker.js"></b8r-component>

For legacy `.component.html` components, you omit the `.component.html` from the end of the path.

```
<b8r-component path="path/to/some-component"></b8r-component>
```

