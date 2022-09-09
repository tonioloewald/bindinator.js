# React vs b8r

> **Note**: updated to reflect the javascript-based views added in v0.6.0

React and `b8r` deal with the same key problem in different ways. _How to tell when the application's state changes and then correctly update the user interface._ (`b8r` actually goes much further and can serve as a much simpler and more efficient alternative to [Redux](https://redux.js.org/) or [RxJS](https://rxjs.dev/))

If you imagine that state is stored in an object, let's call it `props`, then it's hard to tell when it changes, e.g. somewhere in your program someone writes `props.foo.bar = 17`.

React takes a _functional_ approach, based on the idea that the user interface should be a (side-effect free, mostly) product of the application's state. Change the state, then re-render the user interface based on the state, using various optimizations to avoid rebuilding things that don't need to change.

`b8r` instead says, "if you promise to store your state in my registry and either change it by telling me to change it or tell me if you change it behind my back, I'll keep everything up-to-date". It does this by being very good at figuring out precisely which bits of the DOM care about precisely which bits of state.

There are lots of wrinkles, optimizations, and implications to each approach. And both frameworks do similar things to minimize perturbations to the DOM (although `b8r` does not use a "virtual DOM").

I happen to think `b8r` is simpler, easier to grok, and easier to work with, but clearly plenty of people love React. I also object to React being a "platform abstraction layer". (`b8r` really isn't, it's more like a platform "toolbox".) A lot of the ideas in `b8r` have appeared in part or in full in other frameworks, but I think `b8r` offers a unique blend of completeness and simplicity. E.g. it does not rely on custom tooling, new templating languages, or transpilation.

## React vs. b8r — ToDo List Example

I imagine a lot of potential users of `b8r` will be familiar with [ReactJS](https://reactjs.org/).
Below I've included the React **ToDo** example along with the same thing implemented using `b8r`.

To see the ReactJS version in action, go to the [ReactJS home page](https://reactjs.org/). It's
one of the interactive examples. The `b8r` version is [here](?source=components/todo-simple.js)
(this link won't work if you're reading this in github).

### React Version

![react to-do example in action](docs/images/react-to-do.png)

```
class TodoApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], text: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
```

The first line of the constructor is a consequence of React creating components via subclassing.

The whole classical inheritance pattern (even though under the hood Javascript
does prototypical inheritance) means that if a subclass fails to call an
inherited method correctly things can go wrong, sometimes in subtle ways.

The last two lines exist solely because of React's need to pipe things around, even
within a component. (Some toolchains allow you to declare instance methods as arrow functions,
effectively doing this for you. This is an example of React solving problems with tooling.) More on this below.

(It's worth noting that **custom elements** are also created via subclassing and
run into similar issues. As a result of this, [web-components.js](?source=source/web-components)
automatically attaches event handlers to the component _instance_ in its constructor.
The difference is that `b8r` doesn't assume the constructor needs to be overridden
if the component does anything interesting, and handles the boilerplate function binding
for you without without manually binding instance methods or transpilation.)

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
`<TodoList>` — by needlessly rendering everything in `<TodoApp>`. So all
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
-- putting `this.handleChange` here — won't work, because it's going to be
inserted in the virtual DOM element's props, and then `this` will point to the
wrong thing, and the second most obvious thing — putting `this.handleChange.bind(this)`
here — is an _antipattern_ which is typically addressed by a suitably configured
linter screaming at you (because you run the risk of leaking context every time
you `render`, and you `render` a lot).

Now, React does lots of clever stuff to avoid doing inefficient things like
rebuilding DOM nodes unnecessarily. Still, it's interesting to turn on Chrome's
_performance > rendering > paint flashing_ tool and see just what does get redrawn
and when. The `<h3>` tag, for example, gets redrawn when a new item is created —
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
default, halts propagation of an event when it has been handled once.

`b8r` will stop an event that's been handled unless the handler explicitly returns `true`,
allowing you to allow propagation or prevent default behavior, or not, yourself.

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

![b8r to-do example in action](docs/images/b8r-to-do.png)

This is the equivalent thing in `b8r`:

```
export default {
  view: ({ h3, ol, li, input, button }) => [
    h3('To Do List'),
    ol(li({dataList: '_component_.todos:_auto_', bindText: '.text'})),
    input({placeholder: 'enter reminder', bindValue: '_component_.text', 'onKeydown(Enter)': '_component_.add'}),
    button('Add to List', {onClick: '_component_.add', bindEnabledIf: '_component_.text', bindText: 'Add #{{_component_.nextItem}}'})
  ],
```

`b8r` doesn't rely on transpilation or other specialized tooling, so views are constructed using pure
javascript. This has been refined to the point where it's quicker and easier than HTML or JSX.

The `view` function will be passed one argument which is a proxy that will produce factory
functions for any desired DOM element as properties. So, the destructuring in the arguments
immediately creates everything needed.

Objects passed to the factory functions set attributes on the element, while strings and HTMLElements
are appended. `camelCase` attributes are converted to `kebab-case` and certain properties get
special treatment, notably `bindValue: "..."` is syntax sugar for binding the `value` of the element
to the specified path.

`onClick` is syntax sugar for an event-binding, as is `'keydown(Enter)` which not only handles
the keydown event, but filters it based on the keystroke.

`dataList` binds the list at `_component_.todos`, and `:_auto_` ensures that a unique key is generated
for each instance. This usually requires coding in React and Angular, the React example uses a hack,
`b8r` does this automatically and correctly, and if you already have a unique id (as is often the case)
then instead of `_auto_` you simply use the property name (e.g. `uid`) or even path (e.g `path.to.uid`)
within the object.

```
  initialValue: ({ component }) => ({
    todos: [],
    text: '',
    nextItem: 1, // just here to match the React example
    add: () => {
      const {text, todos} = component.data
      if(text) {
        todos.push({text})
        component.data.text = ''
        component.data.nextItem += 1
      }
    }
  })
}
```

`initialValue` simply returns the initial private state of the component. It
is passed an object with lots of useful stuff in it, but `component` is simply
the `element` hosting the component, and `data` is a *registry proxy* of the
component's private data.

Registry proxies are syntax-sugar for registry `get()` and `set()` calls.
So `component.data.foo` is equivalent to `b8r.get(componentId + '.foo')` and
`component.data.bar = 'baz'` is equivalent to `b8r.set(componentId + '.bar', 'baz')`.

The object passed to `initialValue` also contains `get` and `set` accessors
specific to the component, so there are many ways to write the `add()` method.

Finally, note that `initialValue` can in fact be an async function if so desired.

### An Aside on Unnecessary Redraws

If you want to know just how constantly react is calling `render`, put in a
`console.log` and watch it run every time you hit a key, and when you create a
new <TodoList> item. You can also use Chrome's render performance tooling to
flash a rectangle every time layout gets re-rendered. I've done this with the
two examples being discussed.

![redraw flashing in react](./docs/images/react-screen-redraws.gif)

In order to minimize unnecessary redraws, React utilizes a "virtual DOM" that
is intended to store the state of DOM elements so that it can tell whether they
need to be redrawn. Despite this, this simple example redraws the static heading
for no reason and, in practice, developers frequently need to implement a method
named `shouldComponentUpdate` to manually block redraws.

![redraw flashing in b8r](./docs/images/b8r-screen-redraws.gif)

So far, `b8r` does not use a "virtual DOM" and it does not provide a mechanism
for manually blocking unnecessary redraws. When the user changes a value in a bound
input (and some other elements), b8r updates any bound path and then updates all
elements bound to that path _except the element that was the source of the change_.
This is, by far, the most common source of problems in a user interface, e.g. if an
input field changes a bound value and then that bound value is sent back into the input
then its selection and focus state may be lost, and if you imagine that the input field
contains a number, a "smart" optimization might consider the new value to be different.

`b8r` does one more thing to prevent unnecessary refreshes — tracking the bound values
"last seen" during an update and not redrawing if they haven't changed. This can prevent computed
bindings from being unnecessarily called (if something is bound to `path.to.foo(path.to.bar, path.to.baz))`,
`b8r` won't call `foo` if `bar` and `baz` haven't changed since it last called `foo`.

### Why no form?

An earlier version of the `b8r` example used a `<form>` simply to mirror what
the React example does.

The form allows the user to hit "enter" to "submit" the form (saving an event handler?) 
but really `<form>` elements have a bunch of behavior dating back to before Web 2.0
that aren't really desireable, e.g. by default, submitting a form reloads the page…

### A final aside on sub-components…

The entire ToDo "app" has been encapsulated as a single component
here, whereas in the React example `TodoList` is a sub-component of the app.
You could, of course, encapsulate the list as a sub-component in `b8r` too.

(Realistically, why would you do this? You wouldn't. It maybe makes sense in
the React version because by doing this you don't end up re-rendering the list
every time you type a keystroke in the input field.)

You might end up wanting to define a sub-component that looked like this:

```
b8r.makeComponent('todo-items', {
  view: ({ol, li}) => ol(li({
    dataList: '_component_.list:_auto_',
    bindText: '.text'
  }))
})
```

And compose it thus:

```
  view: ({ h3, _comp, input, button }) => [
    h3('To Do List'),
    _comp({name: 'todo-items'}),
    input({placeholder: 'enter reminder', bindValue: '_component_.text', 'onKeydown(Enter)': '_component_.add'}),
    button('Add to List', {onClick: '_component_.add', bindEnabledIf: '_component_.text', bindText: 'Add #{{_component_.nextItem}}'})
  ],
```

This is quite similar to what's going on in React chiefly because the outer context
is sharing its _private_ data with the inner component.

That's it!
