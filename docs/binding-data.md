# binding data

Keeping data consistent between an underlying data structure (or "model") and 
a user interface (or "view") is `b8r`'s job one.

`b8r` aims to provide a simple, robust set of tools for doing this.

## Anatomy of a Data-Binding

The basic form of a data binding is `data-bind="target=path.to.value"`.

```
<div data-bind="text=path.to.text"></div>
```

In `b8r` terms, `text` is the **target** (the DOM property you are binding
data to and/or from), while `path.to.text` is the data **path**.

- [Binding to the DOM](#source=source/b8r.toTargets.js) 
- [Binding from the DOM](#source=source/b8r.fromTargets.js))
- [Registry](#source=source/b8r.registry.js)) (see the section on **Paths**)

### Multiple Bindings

You can put **multiple bindings** in a single `data-bind` attribute, separated by semicolons.

```
<input type="checkbox" data-bind="
  checked=path.to.value;
  enabled_if=app.enable_stuff
">
```

### Multiple Targets

You can put **multiple targets** on the target side of a binding, separated by commas.

```
<img data-bind="
  img=path.to.image_url;
  attr(alt),attr(aria-label)=path.to.description;
">
```

### Multiple Values

You can put **multiple values** into a binding, which only makes sense if you're using the `method()` target
(because the values will be passed as array to the method specified).

```
<div data-bind="method(path.to.fn)=path.to.x,path.to.y"></div>
```

### Interpolated Values

Finally, you can put an *interpolated value* on the right side of a data-binding, e.g.

```
<div data-bind="text=${user.first} ${user.last}"></div>
```

This is intended to be familiar to Javascript programmers (it looks like interpolated strings in Javascript)
but be aware that all it does pull `b8r` paths -- code will not be executed.

## Data Path Types

There are three types of data path.

### Absolute Data Path

A typical path such as `path.to.value` is an absolute path. The first "word" is the registry root,
and the rest of the path drills down into it pretty much as you'd expect.

The main things that differentiate a `b8r` data-path from ordinary javascript variable destructuring
are array references can include a path lookup, e.g. instead of foo.list[17] you can write foo.list[id=123] 
as shorthand for `foo.list.find(({id}) => id == '123')` and that `.` always works like the experimental `?.` 
operator (so it doesn't blow up if it hits a `null` or `undefined` value).

### Relative Data Path

A path that begins with a `.` is considered to be `relative` to its *closest data-ancestor*.  
*Relative bindings only make sense inside a data-ancestor.*

Say, what? Typically, the *closest data-ancestor* is the *list-instance* containing the binding (which
may be the bound element itself) or an element with an explicit `data-path` attribute. The former case
is by far the most common, while the latter requires you to explicitly set the `data-path` at some
point.

E.g. if we have a list like this:

```
<ul>
  <li data-list="chat.messages:id">
    <h4 data-bind="text=.title">Title</h4>
    <p data-bind="text=.body">Body text goes here</p>
  </li>
</ul>
```

Then the `<h4>`'s `textContent` is bound to the `title` of each element in the array of messages, and the
`<p>`'s `textContent` is bound to the `body`.

And yes, lists within lists behave as you would expect.

When `b8r` creates a list-instance in the DOM, it will rewrite all the relative paths inside
that list-instance as absolute paths to the actual instance. So you'd end up seeing
something like this in the DOM:

```
<ul>
  <li data-list-instance="chat.messages[id=1]">
    <h4 data-bind="text=chat.messages[id=1].title">My first message</h4>
    <p data-bind="text=chat.messages[id=1].body">This is what I wrote</p>
  </li>
  ...
  <li data-list="chat.messages:id">
    <h4 data-bind="text=.title">Title</h4>
    <p data-bind="text=.body">Body text goes here</p>
  </li>
</ul>
```

### Component Data Path

A path that begins with `_component_` refers to the component's private instance data. This 
is data that can be set and accessed via `register`, `get`, and `set` inside a component's
`<script>`.

So in a component that looked like this:

```
<p data-bind="text=_component_.caption">Caption Goes Here</p>
<script>
  set({caption: 'hello world'})
</script>
```

The component will display 'hello world'. (Obviously, this is a dumb example.)

Again, when `b8r` creates a component instance, it makes sure the component has a unique
id, and creates a registry entry for that component and then rewrites the instance's
bindings, so you might end up with something like this in the DOM:

```
<p data-bind="text=c#example#123.caption">hello world</p>
```

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

## The Binding Hierarchy

A single element can have a `data-list`, `data-component`, and `data-bind` attribute. (It can also
have a `data-event` attribute for that matter.)

These bindings have a hierarchy -- that exact order -- i.e. the `data-list` binding is outermost
and is always resolved first, while the `data-bind` binding is the innermost and always resolved last.
Thus, `data-component` and `data-bind` bindings are "dormant" in a list-template, and `data-bind`
bindings are "dormant" in an unloaded component.

This means that you don't need concentric elements just to have a list of bound components.

## Lists

`b8r` provides extensive support for binding arrays to the DOM via the `data-list` attribute. Here's
a simple example which binds a list of objects, each with a `name` property to an unordered
list in the DOM.

    <ul>
      <li 
        data-list="path.to.list"
        data-bind="text=.name"
      ></li>
    </ul>

### Convenience Mathods

    b8r.getListInstance(element)

`b8r.getListInstance` retrieves the array element corresponding to the `[data-list-instance]`
the element belongs to.

    b8r.getListInstancePath(element)

`b8r.getListInstancePath` retrieves the data-path corresponding to the `[data-list-instance]`
the element belongs to.

    b8r.getListPath(element)

`b8r.getListPath` retrieves the data-path corresponding to the list of which the `[data-list-instance]`
is a member.

    b8r.removeListInstance(element)

`b8r.removeListInstance` removes the list member corresponding to the `[data-list-instance]`
and updates the DOM.

### Sorting, Filtering — Computed List Bindings

You can bind to a method (by path) so long as the method returns a filtered subset
of the source list, so:

    <ul>
      <li 
        data-list="path.to.filter(path.to.list):id-path"
        data-bind="text=.name"
      ></li>
    </ul>

Will allow you to dynamically filter, sort, or otherwise rearrange the source list.

The individual list instances will have paths derived from the source list, so
(for example) `path.to.list[uuid=9884698d-2f44-43a6-9c6f-30098e84f233]`. If no
id-path is provided, `b8r.bindList` will `throw` an exception.

### Under the Hood

Under the hood, `b8r` uses the DOM element with the `data-list` attribute as both a 
__template__ and a __bookmark__ within the DOM. For each element in the bound list
`b8r` will clone the template, remove its `data-list` attribute, add a `data-list-instance`
attribute with a `path` to the list element's corresponding data, and then `bindAll` the
list element.

These clones are inserted in order before the list template.

Assuming the `data-list` attribute is simply `path.to.list` the `data-list-instance`
attributes will be `path.to.list[0]`, `path.to.list[1]` and so on.

If an `id-path` is provided (see below), the path will use the `id-path`.

### Efficient List Updates

To help `b8r` update lists more efficiently, you can provide an `id-path` in a list binding.
Typically, the `id-path` will simply be the name of some guaranteed unique object property
from a service (e.g. `id`, `uuid`, `fooId`, or `foo_id`). This lets `b8r` ensure it can 
tell exactly which list instance corresponds to a given item in a source `Array`.

The format here is simply `data-list="path.to.list:id-path"`, e.g.

    <ul>
      <li 
        data-list="path.to.list:id"
        data-bind="text=.name"
      ></li>
    </ul>

Sometimes you'll have a list with no unique id (or you may wish not to use the id, so that
the user can, for example, add new items to the list without their round-tripping to the
service layer). In such cases you can specify an `_auto_` generated id.

    <ul>
      <li 
        data-list="path.to.list:_auto_"
        data-bind="text=.name"
      ></li>
    </ul>

### Annotating Empty Lists

If you want to provide feedback for an empty list, a list template (an element with the
`data-list` attribute) will have the class `-b8r-empty-list` if bound to an empty or
non-existent list.