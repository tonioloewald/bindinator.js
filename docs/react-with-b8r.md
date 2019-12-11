# React & b8r

React and `b8r` interoperate fairly nicely, so long as `b8r` doesn't directly
modify any elements React is managing.

`b8r` isn't designed for server-side rendering, so if you're doing that you'll want
to wrap calls to `b8r` in `if (__BROWSER__) { ... }` control structures. These issues
run pretty deep, because the nodejs/npm ecosystem doesn't yet fully support ES6 Modules 
and `b8r` is all in on ES6 modules.

Assuming you use pure javascript b8r components, you can turn them into 
pure React components via (this is .jsx):

    if (__BROWSER__) {
      b8r.makeComponent('some-component', {
        ...
      })
    }

    const SomeComponent = () => <b8r-component name="some-component"></b8r-component>

You can run into problems with React gratuitously re-rendering elements it doesn't
understand so you might want to create a wrapper component that explicitly blocks this:

    // import React from wherever you like...

    class BindinatorComponent extends React.Component {
      shouldComponentUpdate () {
        return false
      }

      render() {
        const {name, path} = this.props
        return React.createElement('b8r-component', {name, path});
      }
    }

You can use this component by setting the `name` or `path` prop as you see fit. (Note that this simple
example does not deal with React `children`. Given that React has its own ideas about how children
are handled, dealing with them might be tricky.)

React can send data to `b8r` the obvious way (`b8r.set` and `b8r.register` for example).

The simplest way I've found to get data from `b8r` to React is via
[Custom Hooks](https://reactjs.org/docs/hooks-custom.html). E.g.

    import b8r from 'path/to/b8r.js'
    import React from 'path/to/react.js'

    export const usePath = (path, initialValue = null) => {
      const [valueAtPath, setValueAtPath] = React.useState(b8r.get(path) || initialValue);
      React.useEffect(() => {
        const observer = () => {
          setValueAtPath(b8r.get(path));
        }
        b8r.observe(path, observer);
        return () => {
          b8r.unobserve(path, observer);
        }
      })
      return valueAtPath;
    }

With `usePath` thus implemented any React pure function component can access any 
`b8r` path as state. (It's actually kind of wonderful — indeed, it's a lot nicer 
than regular React hooks because you don't end up with mysterious "you've called 
this hook at the wrong time but we won't tell you which hook or where it was called" 
errors. You might even be tempted to use `b8r` for all your state management.)

[Hooks](https://reactjs.org/docs/hooks-intro.html) are a pretty recent feature of 
React (introduced in v16.8), and it's quite possible you're stuck on an older version 
and can't use them. In that case you'll probably need to build some kind of 
state constainer. If there's sufficient interest, I'll implement one.