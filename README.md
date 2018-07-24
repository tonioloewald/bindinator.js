<div style="text-align: center">
  <img
    alt="bindinator b∞r logo"
    style="width: 600px; height: 600px; padding: 5vh 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.75));"
    src="images/bindinator-logo.svg"
  >
</div>

[bindinator.com](http://bindinator.com/) |
[Demo (github pages)](https://tonioloewald.github.io/bindinator.js/) |
[Demo (rawgit)](https://rawgit.com/tonioloewald/bindinator.js/master/) |
[github](https://github.com/tonioloewald/bindinator.js)

The lazy JavaScript framework.

A web application comprises DOM elements styled with CSS (*views*), and wired up to *behaviors* implemented in Javascript (or, moving forward, Webassembly), and using *data* obtained from services.

With `b8r`, you can **bind data to the DOM** as simply as this:

<div data-component="fiddle" data-path="drumpf"></div>

In this example `text` is the **target**, `example.name` is the `data-path`. The root **name**
(`example`) is bound to the path via `b8r.register`.

Note the use of an ES6-*like* interpolated string (it doesn't do `eval`, it just looks up paths).
If a binding does not include `${...}` it is assumed to be a data-path. You can try to change the
binding to `data-bind="text=example.name"` or `data-bind="text=${example.name} says “hi”"`.

You can update data using `b8r.set`, e.g.

```
b8r.set('example.name', 'Trump')
```

Try it in the **console**! (Unlike typical "fiddles" the inline b8r's inline examples are not
isolated in their own iframes -- it's all happily running in the same scope.)

Binding **lists** is just as simple:

<div data-component="fiddle" data-path="list"></div>

Within a list binding, paths beginning with a period are relative to the list instance.

A few of things to try in the console:

```
b8r.set('example2.list[id=2].name', 'Veejer')
b8r.push('example2.list', {id: 4, name: 'Clear Air Turbulence'})
b8r.remove('example2.list[id=3]')
```

Most **updates** are handled automatically:

<div data-component="fiddle" data-path="update"></div>

And binding **events**:

<div data-component="fiddle" data-path="events"></div>

Events are bound via data-paths as just like data. In this example `click` is the event type and
`example4.click` is the path to the event.

Try this in the console (and then click the button again):

```
b8r.set('example4.click', () => alert('I changed the event handler'))
```

Any of these snippets can be converted into reusable components by saving them as (say)
`example.component.html`. (Each of these snippets is in fact a complete component.)

You can load a component using `b8r.component('path/to/example')`. Once
loaded, it will automatically be inserted where-ever you use `data-component="example"`.
Components can be nested exactly as you would expect.

A **stateful component** looks like this:

<div data-component="fiddle" data-path="clock"></div>

You can build a **To Do List** app like this:

<div data-component="fiddle" data-path="todo"></div>

And you can use third-party libraries easily as well (this example uses `showdown.js` via
the [text-render.js](#source=lib/text-render.js) library to render markdown.)

<div data-component="fiddle" data-path="markdown-editor"></div>

## In a Nut

- bind data to (and from) the DOM using `data-bind`.
- bind lists to the DOM using `data-list`.
- bind events to event handlers using `data-event`.
- bind components to the DOM using `data-component`.
- bind data to paths using `b8r.register`, `b8r.set`, and `b8r.get`.

We can register data (*models* and *controllers*) and load components (*views*) asynchronously.
If the user clicks the button before the controller is registered, the controller method will be
called when it becomes available.

Copyright ©2016-2018 Tonio Loewald
