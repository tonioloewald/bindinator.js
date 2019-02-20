# React vs. b8r

I imagine a lot of potential users of `b8r` will be familiar with [ReactJS](https://reactjs.org/).
Below I've included the React "To Do" example with comments comparing it to how it differs from
`b8r`.

## React Version

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

The whole classical inheritance pattern means that if a subclass fails to call an 
inherited method correctly things can go wrong, sometimes in subtle ways. 
It would be better if super(props) were a guaranteed behavior and the Component 
class had a virtual method that could be overridden for this purpose.

The last two lines exist solely because of React's need to pipe things around, even
within a single instance, and because the way React does this is kind of dumb. 
More on this below.

```
  render() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
```
Two lines of code that simply pass the parcel and rename it.
```
          <label htmlFor="new-todo">
            What needs to be done?
          </label>
          <input
            id="new-todo"
            onChange={this.handleChange}
```
Remember how we bound `this.handleChange` to `this`
in the constructor? Well that's because doing the obvious thing (putting `this.handleChange.bind(this)`
here) is an _antipattern_ addressed by linting. Because
react is constantly calling render, binding the method here runs the risk
of leaking context like crazy.
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
When the `<input>` changes, `handleChange` takes the value, sets state.text to that value, 
which triggers a `render` which tells the DOM to set the `<input>.value` to the
next value (which it already has, so never mind.)
```

  handleSubmit(e) {
    e.preventDefault();
```
An interesting case where `b8r` is less "vanilla" than React, which is especially interesting
since React has its own entire event system.

If we're going to have our own event system, why not make the common case (handle events ONCE) 
the default? But because React re-implements Javascript's default behavior, we have to
prevent that default behavior.

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
to click the button, but ignoring the click is a UI _antipattern_.
```
    const newItem = {
      text: this.state.text,
      id: Date.now()
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

The equivalent `b8r` ToDo list would look something like:

```
<h3>ToDo</h3>
<ul>
  <li data-list="_component_.list:id" data-bind="text=.text"></li>
</ul>
```
Ordinarily, I wouldn't use a `<form>` element because the default behavior of forms is bad, but we're trying to be like the React example so I've put one in and blocked the default onsubmit behavior.

## b8r version

A `b8r` component is a single "html" file (it's more of an html `fragment`). The `<script>` tag ends up as the body of an `async` `load` function that gets passed a bunch of useful methods, including `get` and `set` which provide convenient access to a component's private data.
```
<form data-event="submit:_b8r_.stopEvent">
```
We don't want the form to reload the page. Ordinarily, I simply wouldn't use a `<form>` because
the default behavior of forms is pathological, and instead add 
`data-event="keydown(Enter):_component_.addItem"` to the `<input>` field (which would then
necessitate `addItem` exiting if `text` is empty.

If we wanted to _exactly_ replicate the React example, we'd add `data-event="submit:_component_.addItem"`
and then, like React, we'd have to exit if `text` were empty and we'd _still_ want to disable the
button for usability.
```
  <input
    placeholder="thing to do"
    data-bind="value=_component_.text"
  >
  <button 
    data-bind="enabled_if=_component_.text;text=Add #${_component_.nextItem}"
```
`b8r` allows the use of interpolated strings in bindings, but it does not allow
arbitrary javascript execution. The idea is _not_ to put business logic in the view
or implement a Turing-complete templating language.
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
      const list = get('list')
      list.push({text: get('text'), id: Date.now()})
      set({
        nextItem: list.length + 1,
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
That's it!


