# binding data

Keeping data consistent between an underlying data structure (or "model") and 
a user interface (or "view") is `b8r`'s job one.

`b8r` aims to provide a simple, robust set of tools for doing this.

## Anatomy of a Data-Binding

The basic form of a data binding is `data-bind="target=path.to.value"`.

```
<div data-bind="div=path.to.text"></div>
```

You can put **multiple bindings** in a single `data-bind` attribute, separated by semicolons.

```
<input type="checkbox" data-bind="
  checked=path.to.value;
  enabled_if=app.enable_stuff
">
```

You can put **multiple targets** on the target side of a binding, separated by commas.

```
<img data-bind="
  img=path.to.image_url;
  attr(alt),attr(aria-label)=path.to.description;
">
```

You can put **multiple values** into a binding, which only makes sense if you're using the `method()` target
(because the values will be passed as array to the method specified).

```
<div data-bind="method(path.to.fn)=path.to.x,path.to.y"></div>
```

Finally, you can put an *interpolated value* on the right side of a data-binding, e.g.

```
<div data-bind="text=${user.first} ${user.last}"></div>
```

This is intended to be familiar to Javascript programmers (it looks like interpolated strings in Javascript)
but be aware that all it does pull `b8r` paths -- code will not be executed.

## Targets

The most commonly used targets are:

- value -- used to bind to `<input>` and similar elements
- checked -- used to bind to `<input type="checkbox">` elements
- text -- used to render text safely into DOM elements
- format -- used to safely render text with simple markdown-style markup into DOM elements
- date -- used to render ISO dates using format strings
- enabled_if -- enables/disables control based on value
- disabled_if -- disables/enables control based on value
- attr -- sets element *markup* attributes (e.g. an `<img>` tag's `alt` attribute)
- prop -- sets element *javascript* properties (e.g. a `<video>` tag's `position` property)

Most targets are "to" only (i.e. when the underlying data changes the DOM is updated -- data goes "to" the view).

Where it makes sense (notably `value`, `checked`) the targets are "two-way", i.e. also "from", and the underlying
model is automatically updated when the user changes the view. This just works.

To learn about out all kinds of targets, as well as get more information about specific targets,
see the documentation for ["to targets"](#source=source/b8r.toTargets.js) 
and ["from targets"](#source=source/b8r.fromTargets.js)