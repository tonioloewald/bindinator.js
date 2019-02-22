# React vs b8r

React and `b8r` deal with the same key problem in different ways. _How to tell when the application's state changes and then correctly update the user interface._ 

If you imagine that state is stored in an object, let's call it `props`, then it's hard to tell when it changes, e.g. somewhere in your program someone writes `props.foo.bar = 17`.

React takes a _functional_ approach, based on the idea that the user interface should be a (side-effect free, mostly) product of the application's state. Change the state, then re-render the user interface based on the state, using various optimizations to avoid rebuilding things that don't need to change.

`b8r` instead says, "if you promise to story your state in my registry and either change it by telling me to change it or tell me if you change it behind my back, I'll keep everything up-to-date". It does this by being very good at figuring out precisely which bits of the UI care about precisely which bits of state.

There are lots of wrinkles, optimizations, and implications to each approach. And both frameworks do similar things to minimize perturbations to the DOM (although `b8r` does not use a "virtual DOM"). 

I happen to think `b8r` is simpler, easier to grok, and easier to work with, but clearly plenty of people love React. I also object to React being a "platform abstraction layer". (`b8r` really isn't, it's more like a platform "toolbox".) A lot of the ideas in `b8r` have appeared in part or in full in other frameworks, but I think `b8r` offers a unique blend of completeness and simplicity. E.g. it does not rely on custom tooling, new templating languages, or transpilation.

## React vs. b8r — ToDo List Example

I imagine a lot of potential users of `b8r` will be familiar with [ReactJS](https://reactjs.org/).
Below I've included the React __ToDo__ example along with the same thing implemented using `b8r`.

To see the ReactJS version in action, go to the [ReactJS home page](https://reactjs.org/). It's
one of the interactive examples. The `b8r` version is [here](#source=todo-simple.component.html)
(this link won't work if you're reading this in github).

### React Version

```
class TodoApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], text: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
```

The first line is a consequence of React creating components via subclassing.

The whole classical inheritance pattern (even though under the hood Javascript
does prototypical inheritance) means that if a subclass fails to call an 
inherited method correctly things can go wrong, sometimes in subtle ways.

The last two lines exist solely because of React's need to pipe things around, even
within a component. More on this below.

(It's worth noting that __custom elements__ are also created via subclassing and
run into similar issues. As a result of this, [web-components.js](#source=lib/web-components.js)
automatically attaches event handlers to the component _instance_ in its constructor.
The difference is that `b8r` doesn't assume the constructor needs to be overridden
if the component does anything interesting, and handles the boilerplate function binding
for you.)

```
  render() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
```
Two lines of code that simply pass the parcel and rename it.

Interestingly, because `items` is part of the outer component's
state, changing it triggers renders of the inner and outer object,
even though the outer object doesn't do any rendering of its own
that relies on items.

(Of course, React lets you implement `shouldComponentUpdate` and reject
rendering if something you don't care changes but, it won't actually
work here since if `state.items` changes you need to communicate this to
`<TodoList>` -- by needlessly rendering everything in `<TodoApp>`. So all
that complexity buys you… what?)
```
          <label htmlFor="new-todo">
            What needs to be done?
          </label>
          <input
            id="new-todo"
            onChange={this.handleChange}
```
Remember how we had `this.handleChange = this.handleChange.bind(this)`
in the constructor? Well that's because doing the most obvious thing:
-- putting `this.handleChange` here -- won't work, because it's going to be
inserted in the virtual DOM element's props, and then `this` will point to the
wrong thing, and the second most obvious thing -- putting `this.handleChange.bind(this)`
here -- is an _antipattern_ which is typically addressed by a suitably configured
linter screaming at you (because you run the risk of leaking context every time
you `render`, and you `render` a lot).

If you want to know just how constantly react is calling `render`, put in a 
`console.log` and watch it run every time you hit a key, and when you create a 
new <TodoList> item.

Now, React does lots of clever stuff to avoid doing inefficient things like
rebuilding DOM nodes unnecessarily. Still, it's interesting to turn on Chrome's
_performance > rendering > paint flashing_ tool and see just what does get redrawn 
and when. The `<h3>` tag, for example, gets redrawn when a new item is created -- 
I'm not sure why that doesn't get optimized out…
```
            value={this.state.text}
          />
          <button>
            Add #{this.state.items.length + 1}
          </button>
        </form>
      </div>
    );
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }
```
When the `<input>` changes, `handleChange` takes its value, sets `state.text` to that value, 
which triggers a `render` which tells the DOM to set the `<input>.value` to the
newly updated `state.text` (which it already has because that's where it came from, 
so never mind.)

Imagine if the `<form>` and the `<TodoList>` were slightly more entangled. 
You might easily end up re-rendering the `<TodoList>` every time you entered a keystroke, 
all so that React can tell itself to set the value of an `<input>` to the value it just 
got from the `<input>`.
```
  handleSubmit(e) {
    e.preventDefault();
```
An interesting case where `b8r` is less "vanilla" than React, which is especially interesting
since React has its own entire event system and `b8r` doesn't.

If we're going to have our own event system, why not make the common case (handle events ONCE) 
the default? But because React faithfully re-implements the DOM's default behavior (only
with synthetic events), we still have to prevent that default behavior.

`b8r` leverages the browser's intrinsic event system, but always "captures" events and, by
default, halts propagation of an event when it has been handled once. (You can explicitly
return `true` from an event handler to have the event continue "bubbling").

`b8r` will stop an event that's been handled unless the handler explicitly returns `true`.
```
    if (!this.state.text.length) {
      return;
    }
```
In `b8r` we would disable the submit button with a simple binding. Allowing the user
to click the button but ignoring the click is an _antipattern_. Things that aren't 
going to work should look and behave like they aren't going to work.
```
    const newItem = {
      text: this.state.text,
      id: Date.now()
```
We need to create a unique `id` because rendering arrays correctly in React requires a _unique_
key value, and using the index is not efficient (if the array gets reordered you may discover
that you aren't correctly and/or efficiently redrawing the DOM). 

In `b8r` if you don't have a unique key, you can use `_auto_` and `b8r` will create the unique 
ids for you. If you don't have a unique key, `b8r` will just handle updates less efficiently.
```
    };
    this.setState(state => ({
      items: state.items.concat(newItem),
      text: ''
    }));
  }
}

class TodoList extends React.Component {
  render() {
    return (
      <ul>
        {this.props.items.map(item => (
          <li key={item.id}>{item.text}</li>
```
Here's where the "unique" `id` gets used. It could just as easily use the array
index in this case, but I guess the example was trying to be "realistic"?
```
        ))}
      </ul>
    );
  }
}

ReactDOM.render(
  <TodoApp />,
  document.getElementById('todos-example')
);
```

### b8r version

The equivalent `b8r` ToDo list would looks like:

```
<h3>ToDo</h3>
<ul>
  <li data-list="_component_.list:_auto_" data-bind="text=.text"></li>
```
Note the use of `_auto_` to get `b8r` to auto-generate _unique_ ids for the array elements.
(Not "probably" unique. Guaranteed unique.) If we wanted to do it the same was as React 
did, we'd generate `id` in some way, e.g. [uuid](#source=lib/uuid.js), and have 
`data-list="_component_.list:id"` here.

A more realistic scenario would be to:

1. add the item (with no proper id) to the list
2. and then call a service to store it on the server. 
3. When the request succeeds it will return the "real" object and you can add the correct (server-generated) id to the object, `b8r` can efficiently update it using the automatically generated `_auto_` id.
4. If the service fails in some way flag the item for resend or remove it and display display an error or something.
```
</ul>
```
Note that the React version defines `TodoList` as a subcomponent (corresponding to the `<ul>`
tag) whereas we're just inlining it. I'll discuss this further at the end.

```
<form data-event="submit:_b8r_.stopEvent">
```
Ordinarily, I wouldn't use a `<form>` element because the default behavior of forms is 
often (usually!) not what you want, but we're trying to be like the React example so 
I've put one in and blocked the default `onsubmit` behavior.

The `<form>` saves us putting an event handler on the `<input>`.
My preference would be to skip the `<form>` and put explicit event handlers 
for the `keydown` (on the `<input>`) and the `click` (on the `<button>`).

**Aside**: `b8r` offers a convenience for key events -- you can write (for example) 
`data-event="keydown(Enter):...` to avoid writing a bunch of boilerplate filter code 
in the event handler.

A `b8r` component is a single "html" file (it's more of an html `fragment`). The `<script>` 
tag ends up as the body of an `async` `load` function that gets passed a bunch of useful 
methods, including `get` and `set` which provide convenient access to a component's private 
data. `_component_` refers to the component's private data in bindings.

If a `b8r` component includes a `<style>` tag you can refer to the component's `class` -- 
`<component-name>-component` -- as `_component_` in the component's CSS selectors,
e.g. `._component_ { background: red; }`.
```
  <input
    placeholder="thing to do"
    data-bind="value=_component_.text"
  >
  <button 
    data-bind="enabled_if=_component_.text;text=Add #${_component_.nextItem}"
```
`b8r` allows the use of ES6-like interpolated strings in bindings, but it _does not allow_
arbitrary javascript, just insertion of data by path. The idea is _not_ to put business logic 
in the view or implement a Turing-complete templating language.
```
    data-event="click:_component_.addItem"
  ></button>
</form>
```
So you get the encapsulation of React's single-file component, along with the clean separation of presentation (style and html) from logic (script).
```
<script>
  set({
    list: [],
    text: '',
    nextItem: 1,
    addItem() {
      const {list, nextItem, text} = get()
      list.push({text})
      set({
        nextItem: nextItem + 1,
        list,
        text: ''
      })
    }
  })
</script>
```
Note how all the logic is in one place!

To actually use the component, we'd write:
```
<b8r-component path="path/to/todo-simple"></b8r-component>
```
Or, in "pure javascript", something like:
```
b8r.component('path/to/todo-simple').then(c => b8r.insertComponent(c, document.body))
```
#### A final aside on sub-components…

The entire ToDo "app" has been encapsulated as a single component
here, whereas in the React example `TodoList` is a sub-component of the app.
You could, of course, encapsulate the list as a sub-component in `b8r` too.

(Realistically, why would you do this? You wouldn't. It maybe makes sense in
the React version because by doing this you don't end up re-rendering the list 
every time you type a keystroke in the input field.)

Because `b8r` doesn't provide a really easy way to write inline subcomponents (I've never found
a need), you'd need to break out a new file or use `b8r`'s slightly ungainly syntax 
for defining components in pure javascript.

So you'd end up wanting to define a component that looked like this:
```
<ul>
  <li data-list="_data_:_auto_" data-bind="text=.text"></li>
</ul>
```
And compose it thus:
```
<b8r-component path="path/to/todo-list" data-path="_component_.list"></b8r-component>
```
If we wanted to avoid creating a separate file for the component, we could
define it inline thus:
```
b8r.makeComponent('todo-list', '<ul><li data-list="_data_:_auto_" data-bind="text=.text"></li></ul>')
```
And then compose it in the DOM thus:
```
<b8r-component name="todo-list" data-path="_component_.list"></b8r-component>
```
This is quite similar to what's going on in React chiefly because the outer component
is sharing its _private_ data with the inner component.

That's it!


