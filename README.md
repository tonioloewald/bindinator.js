<div style="text-align: center">
  <img
    alt="bindinator b∞r logo"
    style="width: 400px; height: 400px; padding: 5vh 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));"
    src="https://bindinator.com/images/bindinator-logo.svg"
  >
</div>

[bindinator.com](http://bindinator.com/) |
[Demo (github pages)](https://tonioloewald.github.io/bindinator.js/) |
[github](https://github.com/tonioloewald/bindinator.js) | 
[npm](https://www.npmjs.com/package/@tonioloewald/b8r) |
[b8r-native](https://github.com/tonioloewald/b8r-native)

## The lazy JavaScript framework.

*Laziness drives every design decision in b8r*. 

- Get more done with less code.
- Don't wait for "compiles" or "transpiles"; debug the code you wrote
- Don't learn new domain-specific languages.
- Don't learn a templating language.
- Don't instal and learn a new debugger, use the existing one you know.
- Write less boilerplate (almost none!)
- Don't worry about state management — `b8r` does that for you
- Don't write lots of "getters" or "selectors" — `b8r` does that for you
- Don't worry about code-splitting — `b8r` is deeply async and deeply lazy
- Don't pass values through hierarchies, send them direct (where appropriate)

And `b8r` is lazy too.

- Don't do things for the browser that the browser knows how to do (like
parse HTML).
- Don't implement a new templating language.
- Don't require special debugging tools, leverage the existing debug tools. 
- Don't add zillions of runtime dependencies.

## Basic Principles
### Put data into b8r's registry to bind it to a path

    b8r.reg.foo = {bar: 17, baz: {lurman: 'hello world'}}
### Bind "data-paths" to the DOM with `data-bind`

    <input data-bind="value=foo.baz.lurman">
### …and stuff "just works"

Now, changes in the DOM update the bound data. And changes made to the data (via the registry)
update the DOM, e.g.

    b8r.reg.foo.baz.lurman = 'goodbye world'
### Binding arrays is just as simple:

    <ul>
      <li data-list="foo.list:id" data-bind="text=.name"></li>
    </ul>

And then bind a list:

    b8r.reg.foo.list = [{id: 1, name: 'Tomasina'}, {id: 2, name: 'Deirdre'}, {id: 3, name: 'Harry'}]

(Or do it the other way around)

Here's all of the above in a live "fiddle". Try adding this above the `<script>` tag (and then clicking **Refresh**):

    <div data-bind="text=foo.baz.lurman"></div>

Now try editing the text in the text field. You could also try replacing the binding in the 
`<input>` with `data-bind="value=foo.list[id=3].name"`. Try editing that!

Or try entering this in the debugger console:

    b8r.reg.foo.list['id=3'].name = 'Harriet'

<b8r-component path="components/fiddle" data-source="components/intro">
</b8r-component>

## Digging a little deeper

There's no magic!

A web application comprises DOM elements styled with CSS (*views*), and wired up to *behaviors*
implemented in Javascript (or, moving forward, Webassembly), and using *data* obtained from services.

With `b8r`, you **bind paths to DOM elements** using the `data-bind` attribute, and 
you bind **javascript objects to paths** using `b8r.reg...`, and `b8r` does the rest.

When you assign objects to `b8r.reg` you are binding data to paths, e.g.

    b8r.reg.foo = {bar: 'hello'}

Now, the object `{bar: 'hello'}` is bound to the path `foo`, so `foo.bar` points to 'hello',
`b8r.reg.foo.bar` and `b8r.get('foo.bar')` will both yield 'hello'.

When you assign new values to the registry, you are in fact altering values inside an 
object bound to the "root" of the path. `b8r.reg.foo.path.to.whatever = ...` changes 
values inside the object bound to `foo`. Using the `reg` to set values also 
tells `b8r` that the values have been changed, allowing it to perform updates.

You must register an object to a name before you can change values inside it. But
*you can always bind to a path*.

<b8r-component path="components/fiddle" data-source="components/drumpf"></b8r-component>

In this example `text` is the **target**, `example.name` is the **data-path**. The root **name**
(`example`) is bound to the path via `b8r.register`.

Note the use of an ES6-*like* interpolated string (it doesn't do `eval`, it just looks up paths).
Usually bindings won't contain `${...}` and are treated as bare data-paths. You can try to change the
binding to `data-bind="text=example.name"` or `data-bind="text=${example.name} says “hi”"`.

You can update data directly using `b8r.reg`, e.g.

```
b8r.reg.example.name = 'Trump'
```

Try it in the **console**!

### Interacting with `b8r` in the console

Unlike typical "fiddles" `b8r`'s inline examples are not isolated in their own
`<iframe>`s—it's all happily running in the same `body`. By default, `b8r` doesn't
leave anything at all in global namespace.

In the `b8r` documentation app I've exposed `b8r` to let you play around. This is 
generally useful for debugging.

If `b8r` weren't exposed you could enter something like the line below in the browser 
console:

    import('./path/to/b8r.js').then(({default}) => {window.b8r = default});

One day you might find this trick useful in a pinch!

Note that you need to point the `import()` at the same exact version of `b8r` you're using
elsewhere — otherwise you won't be able to see the registry.

### Bind arrays to the DOM with `data-list`

Binding **arrays** is just as simple, using the `data-list` attribute:

<b8r-component path="components/fiddle" data-source="components/list"></b8r-component>

Within a list binding, paths beginning with a period are relative to the list instance. (Look at
the `<li>` tags in the preceding example.)

A few of things to try in the console:

```
b8r.reg.example2.list['id=ncc-1031]'].name = 'Veejer'
b8r.reg.example2.list.push({id: 17, name: 'Clear Air Turbulence'})
b8r.reg.example2.fleet = 'Culture + Federation'
b8t.reg.example2.list.splice(1,1)
```

Finally note that a path comprising just a period binds to the entire list item, so if you
bind to a list of bare strings then `data-bind="text=."` will get the string,

### Bindings work both ways

Most **updates** are handled automatically:

<b8r-component path="components/fiddle" data-source="components/update"></b8r-component>

### Bind events to methods with `data-event`

<b8r-component path="components/fiddle" data-source="components/events"></b8r-component>

Events are bound via data-paths as just like data. In this example `click` is the event type and
`example4.click` is the path to the event.

Try this in the console (and then click the button again):

```
b8r.reg.example4.click = () => alert('I changed the event handler')
```

Any of these snippets can be converted into reusable components by saving them as (say)
`example.component.html`. (Each of these snippets is in fact a complete component.)

You can load a component using `b8r.component('path/to/example')`. Once
loaded, it will automatically be inserted where-ever you use `<b8r-component name="example">`.
Components can be nested exactly as you would expect.

### Supports Web-Components

`b8r` provides [convenience methods](?source=source/web-components) for creating 
[Web Components](https://www.webcomponents.org/), a.k.a. Custom Elements, and its bindings 
play nice with them (e.g. waiting for a custom-element's  definition before attempting to bind 
values to it).

### Create Components with HTML or JavaScript

Each of these little inline examples is a component written in HTML. (`b8r` expects
components to be in files named `some-name.component.html`.)

When you want to get into the details of building components, there are sections on
[components](?source=docs/components.md) and on 
[`b8r`'s component API](?source=source/b8r.component.js).

### Add components with `<b8r-component>`

A **stateful component** looks like this:

<b8r-component path="components/fiddle" data-source="components/clock"></b8r-component>

And to use the preceding component, you'd write something like this:

```
<b8r-component path="path/to/clock"></b8r-component>
```

You can build a **To Do List** app like this:

<b8r-component path="components/fiddle" data-source="components/todo"></b8r-component>

> **Note**: the to-do list component in the preceding example is bound to a global path,
> as is the one below. So the two share data automatically. This is *not* an accident.
> If you want a component to have its own unique data, you can bind to `_component_`.

### Composing Components [data-children]

You can create _composable_ components by using `data-children` inside a component. Within a component, the element with the `data-children` attribute (if any) will receive the children of the element bound to the component.

E.g. in the snippet below:

```
<b8r-component name="parent">
  <b8r-component name="child"></b8r-component>
</b8r-component>
```

If the `parent` component has an element with the `data-children` attribute, when it loads, the 
child will be moved into it. In the example below, the `tab-selector` component creates one
tab for each child.

<b8r-component name="fiddle" data-source="components/compose-example"></b8r-component>

### Dog Food!

[bindinator.com](https://bindinator.com) is built using `b8r` (along with numerous third-party 
libraries, none of which are global dependencies). The inline 
[fiddle component](?source=fiddle.component.html) used
to display interactive examples is 343 lines including comments, styles, markup, and code.
`b8r` isolates component internals so cleanly from the rest of the page that the fiddle doesn't
need to use an iframe.

## b8r with npm in five minutes

Here's a really quick start to working with `b8r` to build a web app. (If you're 
interested in building a desktop app, you can try 
[b8r-native](https://github.com/tonioloewald/b8r-native).)

```
mkdir path/to/project
cd path/to/project
npm init
```

Accept all the defaults. (We'll ignore the entry point for now.)

```
npm install @tonioloewald/b8r—save
```

You'll need something to serve pages, a simple option is:

```
npm install http-server—save-dev
```

Now create a simple web page:

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>hello world</title>
</head>
<body>
  <h1 data-bind="text=app.message"></h1>
  <input data-bind="value=app.message">
  <button data-event="click:app.speak">Speak</button>
  <b8r-component path="node_modules/@tonioloewald/b8r/components/photo-tabs"></b8r-component>
  <script type="module">
    // you can also use ../b8r/dist/b8r.min.mjs (minified)
    // or ../b8r/source/b8r.js (source code)
    import b8r from './node_modules/@tonioloewald/b8r/dist/b8r.mjs'

    window.b8r = b8r // so we can play with it in console

    b8r.reg.app = {
      message: 'hello world',
      speak() {
        alert(b8r.reg.app.message)
      }
    }
  </script>
</body>
</html>
```

…and save it as `index.html`.

Now run:

```
npx http-server .
```

And open [http://localhost:8080](http://localhost:8080) in your browser.

Go into your dev tools console (`Cmd+Shift+J` in *Chrome*, `Cmd+Option+C` in *Safari*, 
`Cmd+Option+I` in *Firefox*) and try:

    b8r.reg.app.message                     // should print "hello world"
    b8r.reg.app.message = 'laziness rules!' // updates the value in the input
    b8r.reg.app.speak()                     // same as clicking the button

## In a Nut

- bind paths to DOM elements using `data-bind`.
- bind paths to objects using `b8r.reg.name` (or `b8r.reg['your name']`) `= { ... }`.
- access and modify values bound to paths using `b8r.reg.path.to.value`.
- bind arrays to the DOM using `data-list`.
- bind events to event handlers using `data-event`.
- bind components to the DOM using `<b8r-component>`.
- use [web-components](https://www.webcomponents.org/) without worrying about binding.

We can register data (*models* and *controllers*) and load components (*views*) asynchronously.
If the user clicks the button before the controller is registered, the controller method will be
called when it becomes available.

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Copyright ©2016-2019 Tonio Loewald
