
/**
# History Manager

HistoryManager leverages `b8r`'s registry to make it easy to implement **undo** and **redo**, 
or simply to manage state within a portion of the registry (e.g. handle rollbacks after a 
service failure) or aid in debugging (since it lets you introspect the history of whatever
paths you tell it to handle)

> **Important** right now, history manager can only deal with serializable data.

Simplest usage:

    const {HistoryManager} = await import('path/to/history.js');
    const historyManager = new HistoryManager('some-path', options)

The `historyManager` instance has `undo` and `redo` methods, `canUndo` and `canRedo` properties
to let you know which operations are available, and exposes an `undoBuffer` and a `redoBuffer` 
but more importantly, registers all of these at a path that defaults to `_PATH_history` where 
PATH is the (first) path the historyManager was told to watch. (In the preceding example, that would 
be `_some-path_history`).

It follows that you can implement an **undo** button like this:

    <button
      data-event="click:_some-path_history.undo"
      data-bind="disabled_if(1)=_some-path_history.undoBuffer.length"
    >undo</button>

One `HistoryManager` instance can handle state changes across multiple registry paths:

    const historyManager = new HistoryManager(['some-path', 'other-path'], {
      historyPath, // path for historyManager's properties
        // defaults to _some-path_history
      onUndo, // function called before `undo` is performed,
      onRedo, // function called before `redo` is performed,
      onUndoRedo, // function called before `undo` or `redo` are performed,
      onStateChange, // function called before new state is pushed
        // it will be passed the pathChanged
      afterRestore, // function called after an undo/redo is performed
    })

The `options` object allows you to specify a path for the history and
provide async callbacks to handle `undo`, `redo`, and state changes (e.g.
if you want to want to collapse some of your undoHistory to save memory or make
your application's behavior more intuitive.)

The on callbacks are all `await`ed if async and if they return `false` the operation
is blocked from occurring (in the case of onStateChange this means the new state
doesn't make it into the `undoBuffer` but it doesn't rollback the actual state
change (you need to do that yourself).

This provides you with hooks to handle any service calls required to keep persisted
state in sync with the user interface, and allows errors and failures to be handled.

`afterRestore` allows you to do cleanup after `undo`/`redo` have been performed.
In particular, if you're tracking the user-interface state you may want to focus
on the thing that's just changed or restore a selection.

## Simple Example

Here's a very basic text editor with undo (note that your browser normally provides
you with perfectly good undo inside a text editor, so this is a silly example).

You'll see that undo/redo essentially handle "one character at a time" which
is not fantastic behavior for a serious text editor.

```
<style>
  ._component_ textarea {
    width: 100%;
    min-height: 150px;
  }
</style>
<button
  data-event="click:_simple-undo-example_history.undo"
  data-bind="enabled_if=_simple-undo-example_history.canUndo"
>undo</button>
<button
  data-event="click:_simple-undo-example_history.redo"
  data-bind="enabled_if=_simple-undo-example_history.canRedo"
>redo</button><br>
<textarea data-bind="value=simple-undo-example.text"></textarea>
<script>
  const {HistoryManager} = await import('../lib/history.js');
  b8r.register('simple-undo-example', {
    text: 'hello undo'
  })
  const historyManager = new HistoryManager('simple-undo-example')
  set('destroy', () => {
    b8r.remove('simple-undo-example');
    historyManager.destroy()
  })
</script>
```

## A Slightly Cleverer Example

In this example, an `onStateChange` handler is used to collapse the undo
history if the differences are too minor. In essence, the new state
replaces the most recent undoBuffer entry until there's a difference in
line count or more than one line is different.

A more robust approach would probably be to trigger an async cleanup
operation every so many state changes, and do a better diff to collapse
the undoBuffer.
```
<style>
  ._component_ textarea {
    width: 100%;
    min-height: 150px;
  }
</style>
<button
  data-event="click:_undo-example_history.undo"
  data-bind="enabled_if=_undo-example_history.canUndo"
>undo</button>
<button
  data-event="click:_undo-example_history.redo"
  data-bind="enabled_if=_undo-example_history.canRedo"
>redo</button><br>
<textarea data-bind="value=undo-example.text"></textarea>
<script>
  const {HistoryManager} = await import('../lib/history.js');
  b8r.register('undo-example', {
    text: 'this is somewhat\ncleverer\nexample'
  })
  const historyManager = new HistoryManager('undo-example', {
    onStateChange: pathChanged => {
      if (historyManager.undoBuffer.length === 1) return
      let current = b8r.get('undo-example.text')
      let previous = b8r.last(historyManager.undoBuffer)['undo-example.text']
      if (! previous) return
      current = current.split('\n')
      previous = previous.split('\n')
      if (current.length === previous.length) {
        differences = current.reduce((count, line, idx) => {
          if (line !== previous[idx]) count += 1
          return count
        }, 0)
        if (differences === 1) historyManager.undoBuffer.pop();
      }
    }
  })
  set('destroy', () => {
    b8r.remove('undo-example');
    historyManager.destroy()
  })
</script>
```

~~~~
const {HistoryManager} = await import('../lib/history.js');
const {unique} = await import('../source/uuid.js');
// const {waitMs} = await import('../lib/test.js');

const path = 'undoTest_' + unique()
b8r.register(path, {
  foo: 'bar',
  bar: 'shazam',
})
const historyManager = new HistoryManager(path)

const {historyPath} = historyManager
Test(() => historyManager.undoBuffer[0][path].foo, 'state updated').shouldBe('bar')
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(1)
Test(() => b8r.get(`${historyPath}.canUndo`)).shouldBe(false)

b8r.set(`${path}.foo`, 'baz')
Test(() => b8r.get(`${path}.foo`)).shouldBe('baz')
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(2)
Test(() => b8r.get(`${historyPath}.canUndo`)).shouldBe(true)
Test(() => b8r.get(`${historyPath}.canRedo`)).shouldBe(false)
await historyManager.undo()
Test(() => b8r.get(`${path}.foo`), 'undo works').shouldBe('bar')
Test(() => b8r.get(`${historyPath}.canUndo`)).shouldBe(false)
Test(() => b8r.get(`${historyPath}.canRedo`)).shouldBe(true)
await historyManager.redo()
Test(() => b8r.get(`${path}.foo`), 'redo works').shouldBe('baz')
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(2)
await historyManager.undo()
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(1)
Test(() => b8r.get(`${path}.foo`), 'undoBuffer not corrupted').shouldBe('bar')
await historyManager.redo()
Test(() => b8r.get(`${path}.foo`)).shouldBe('baz')

b8r.set(`${path}.foo`, 'lurman')
Test(() => b8r.get(`${path}.foo`)).shouldBe('lurman')
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(3)

b8r.set(`${path}.foo`, 'romeo + juliet')
Test(() => b8r.get(`${path}.foo`)).shouldBe('romeo + juliet')
Test(() => b8r.get(`${historyPath}.undoBuffer.length`)).shouldBe(4)
await b8r.call(`${historyPath}.undo`)
Test(() => b8r.get(`${path}.foo`)).shouldBe('lurman')
await b8r.call(`${historyPath}.redo`)
Test(() => b8r.get(`${path}.foo`)).shouldBe('romeo + juliet')
await b8r.call(`${historyPath}.undo`)
await b8r.call(`${historyPath}.undo`)
await b8r.call(`${historyPath}.redo`)
Test(() => b8r.get(`${path}.foo`)).shouldBe('lurman')
b8r.set(`${path}.foo`, 'moulin rouge')
Test(() => historyManager.redoBuffer.length, 'redoBuffer reset').shouldBe(0)
b8r.set(`${path}.bar`, 'plankton')
await b8r.call(`${historyPath}.undo`)
Test(() => b8r.get(`${path}.bar`), 'check undo works for independent paths').shouldBe('shazam')
b8r.remove(path)
historyManager.destroy()
~~~~
*/

import b8r from '../source/b8r.js'

const deepClone = (thing) => JSON.parse(JSON.stringify(thing))

export class HistoryManager {
  constructor (watchPaths, options = {}) {
    watchPaths = [watchPaths].flat()
    const {
      historyPath,
      onUndo,
      onRedo,
      onUndoRedo,
      onStateChange,
      afterRestore
    } = {
      historyPath: '_' + watchPaths[0].split('.').pop() + '_history',
      ...options
    }

    b8r.register(historyPath, {
      undoBuffer: [],
      redoBuffer: [],
      canUndo: false,
      canRedo: false,
      undo: this.undo.bind(this),
      redo: this.redo.bind(this),
      observer: this.handleChange.bind(this)
    })

    Object.assign(this, {
      watchPaths,
      historyPath,
      onUndo: onUndo || onUndoRedo,
      onRedo: onRedo || onUndoRedo,
      onStateChange,
      afterRestore
    })

    this.reset()
    this.observe()
  }

  reset () {
    this.undoBuffer.splice(0)
    this.undoBuffer.push(this.watchPaths.reduce(
      (state, watchPath) => {
        state[watchPath] = deepClone(b8r.get(watchPath))
        return state
      },
      {}
    ))

    b8r.touch(this.historyPath)
  }

  observe () {
    this.watchPaths.forEach(path => b8r.observe(path, `${this.historyPath}.observer`))
  }

  unobserve () {
    this.watchPaths.forEach(path => b8r.unobserve(path, `${this.historyPath}.observer`))
  }

  get undoBuffer () {
    return b8r.get(`${this.historyPath}.undoBuffer`)
  }

  get redoBuffer () {
    return b8r.get(`${this.historyPath}.redoBuffer`)
  }

  get canUndo () {
    return this.undoBuffer.length > 1
  }

  get canRedo () {
    return this.redoBuffer.length > 0
  }

  update () {
    const {canUndo, canRedo} = this;
    b8r.set(this.historyPath, {
      canUndo,
      canRedo
    })
  }

  async restore () {
    this.unobserve()
    this.undoBuffer.forEach(state => {
      b8r.forEachKey(state, (value, key) => b8r.replace(key, deepClone(value)))
    })
    if (this.afterRestore) this.afterRestore()
    this.observe()
    this.update()
  }

  async handleChange (pathChanged) {
    if (this.onStateChange && await this.onStateChange(pathChanged) === false) return
    this.undoBuffer.push({
      [pathChanged]: deepClone(b8r.get(pathChanged))
    })
    this.redoBuffer.splice(0)
    this.update()
  }

  async undo () {
    if (this.undoBuffer.length === 1) return false
    if (this.onUndo && await this.onUndo() === false) return false
    this.redoBuffer.push(this.undoBuffer.pop())
    await this.restore()
    return true
  }

  async redo () {
    if (!this.redoBuffer.length) return false
    if (this.onUndo && await this.onRedo() === false) return false
    this.undoBuffer.push(this.redoBuffer.pop())
    await this.restore()
    return true
  }

  destroy () {
    this.unobserve()
    b8r.remove(this.historyPath)
  }
}
