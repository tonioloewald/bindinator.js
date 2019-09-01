/**
# Async Update Queue

`b8r` queues DOM updates and then performs them at the next animation frame. Generally,
you don't need to worry about how this works. Just use [registry](#source=source/b8r.register.js)
methods such as `b8r.set` (and `set` inside components) to change bound values and
everything *should just work*.

If you change values directly (e.g. because you need to make lots of deep changes
to a big dataset efficiently) you can just use `b8r.touch` to inform `b8r` of the changes.

## Manipulating the Update Queue Directly

To add updates for a path to `b8r`'s async update queue use `touchByPath`.

    touchByPath('path.to.data'); // tells b8r to update anything bound to that path
    touchByPath('path.to.data', sourceElement); // as above, but exclude sourceElement
    touchByPath('path.to.list[id=abcd]'); // updates the specified list
    touchByPath('path.to.list[id=abcd].bar.baz'); // updates the underlying list

Similarly, to add an element to the update queue:

    touchElement(element); // tell b8r the element in question needs updating

If you want to precisely update a list item without updating the list it belongs to,
the simplest option is to `b8r.bindAll` the list element or `touchElement` the list element.
This is a tradeoff of worst-case performance (lots of updates to a list) against best-case
performance (a simple update to one item of a list).

All of these updates are asynchronous, so the DOM won't actually change immediately. If you do
want the DOM to change immediately:

    b8r.forceUpdate(); // flushes all queued updates to the DOM synchronously

If you'd prefer to wait for the update(s) to complete and then do something, you can
pass a callback to `afterUpdate`:

    afterUpdate(() => { ... }); // does stuff after forceUpdate fires

afterUpdate fires immediately (and synchronously) if there are no pending updates.
*/
/* global requestAnimationFrame, HTMLElement */

import { dispatch } from './b8r.dispatch.js'
import { find } from './b8r.dom.js'

const _changeList = []
let _updateFrame = null
const _updateList = []
const _afterUpdateCallbacks = []
let _forceUpdate = () => {}

const requestAnimationFrameWithTimeout = callback => {
  let done = false
  const finishIt = () => {
    done || callback()
    done = true
  }
  requestAnimationFrame(finishIt)
  setTimeout(finishIt, 20)
  return { cancel: () => {
    done = true
  } }
}

const getUpdateList = () => {
  if (_updateFrame) {
    _updateFrame.cancel()
    _updateFrame = null
    return _updateList.splice(0)
  } else {
    if (_updateList.length) {
      throw new Error('_updateList is not empty but no _updateFrame set')
    }
    return false
  }
}

const _afterUpdate = () => {
  while (_afterUpdateCallbacks.length) {
    let fn
    try {
      fn = _afterUpdateCallbacks.shift()
      fn()
    } catch (e) {
      console.error('_afterUpdate_callback error', e, fn)
    }
  }
}

const _triggerChanges = () => {
  while (_changeList.length) {
    dispatch('change', _changeList.shift())
  }
}

const _triggerChange = element => {
  if (element instanceof HTMLElement) {
    if (!_changeList.length) {
      requestAnimationFrame(_triggerChanges)
    }
    if (_changeList.indexOf(element) === -1) {
      _changeList.push(element)
    }
  }
}

const asyncUpdate = (path, source) => {
  const item = path
    ? _updateList.find(item => path.startsWith(item.path))
    : _updateList.find(item => (!item.path) && item.source && item.source === source)
  if (!item) {
    if (!_updateFrame) {
      _updateFrame = requestAnimationFrameWithTimeout(_forceUpdate)
    }
    _updateList.push({ path, source })
  } else if (path) {
    // if the path was already marked for update, then the new source element is (now) correct
    item.source = source
  }
}

const afterUpdate = callback => {
  if (_updateList.length) {
    if (_afterUpdateCallbacks.indexOf(callback) === -1) {
      _afterUpdateCallbacks.push(callback)
    }
  } else {
    callback()
  }
}

const touchElement = element => asyncUpdate(false, element)

const touchByPath = (...args) => {
  let fullPath, sourceElement, name, path

  if (args[1] instanceof HTMLElement) {
    [fullPath, sourceElement] = args
  } else {
    [name, path, sourceElement] = args
    fullPath = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path
  }

  asyncUpdate(fullPath, sourceElement)
}

const _setForceUpdate = (fn) => {
  _forceUpdate = fn
}

const _expectedCustomElements = []
const expectCustomElement = async tagName => {
  tagName = tagName.toLocaleLowerCase()
  if (window.customElements.get(tagName) || _expectedCustomElements.includes(tagName)) return
  _expectedCustomElements.push(tagName)
  await window.customElements.whenDefined(tagName)
  find(tagName).forEach(elt => {
    delete elt._b8rBoundValues
    touchElement(elt)
  })
}

export {
  // hack to eliminate circular dependency
  _setForceUpdate,
  asyncUpdate,
  getUpdateList,
  _triggerChange,
  _afterUpdate,
  afterUpdate,
  touchElement,
  touchByPath,
  expectCustomElement
}
