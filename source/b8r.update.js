/**
# Async Update Queue

When data changes "out of b8r's sight" you may need to inform b8r of the change so it can
make appropriate changes to the DOM.

    touchByPath('path.to.data'); // tells b8r to update anything bound to that path
    touchByPath('path.to.data', sourceElement); // as above, but exclude sourceElement
    touchElement(element); // tell b8r the element in question needs updating
    touchByPath('path.to.list[id=abcd]'); // updates the specified list
    touchByPath('path.to.list[id=abcd].bar.baz'); // updates the underlying list

If you want to precisely update a list item without updating the list it belongs to,
the simplest option is to `b8r.bindAll` the list element or `touchElement` the list element.
This is a tradeoff of worst-case performance (lots of updates to a list) against best-case
performance (a simple update to one item of a list).

All of these updates are asynchronous, so the DOM won't actually change immediately. If you do
want the DOM to change immediately:

    b8r.force_update(); // flushes all queued updates to the DOM synchronously

If you'd prefer to wait for the update(s) to complete and then do something, you can
pass a callback to `afterUpdate`:

    afterUpdate(() => { ... }); // does stuff after force_update fires

afterUpdate fires immediately (and synchronously) if there are no pending updates.
*/

import { dispatch } from './b8r.dispatch.js'

const _change_list = []
let _update_frame = null
const _updateList = []
const _afterUpdate_callbacks = []
let _force_update = () => {}

const requestAnimationFrameWithTimeout = callback => {
  let done = false
  const finishIt = () => {
    done || callback()
    done = true
  }
  requestAnimationFrame(finishIt)
  setTimeout(finishIt, 20)
  return { cancel: () => done = true }
}

const getUpdateList = () => {
  if (_update_frame) {
    _update_frame.cancel()
    _update_frame = null
    return _updateList.splice(0)
  } else {
    if (_updateList.length) {
      throw '_updateList is not empty but no _update_frame set'
    }
    return false
  }
}

const _afterUpdate = () => {
  while (_afterUpdate_callbacks.length) {
    let fn
    try {
      fn = _afterUpdate_callbacks.shift()
      fn()
    } catch (e) {
      console.error('_afterUpdate_callback error', e, fn)
    }
  }
}

const _trigger_changes = () => {
  while (_change_list.length) {
    dispatch('change', _change_list.shift())
  }
}

const _trigger_change = element => {
  if (element instanceof HTMLElement) {
    if (!_change_list.length) {
      requestAnimationFrame(_trigger_changes)
    }
    if (_change_list.indexOf(element) === -1) {
      _change_list.push(element)
    }
  }
}

const asyncUpdate = (path, source) => {
  const item = path
    ? _updateList.find(item => path.startsWith(item.path))
    : _updateList.find(item => (!item.path) && item.source && item.source === source)
  if (!item) {
    if (!_update_frame) {
      _update_frame = requestAnimationFrameWithTimeout(_force_update)
    }
    _updateList.push({ path, source })
  } else if (path) {
    // if the path was already marked for update, then the new source element is (now) correct
    item.source = source
  }
}

const afterUpdate = callback => {
  if (_updateList.length) {
    if (_afterUpdate_callbacks.indexOf(callback) === -1) {
      _afterUpdate_callbacks.push(callback)
    }
  } else {
    callback()
  }
}

const touchElement = element => asyncUpdate(false, element)

const touchByPath = (...args) => {
  let full_path, sourceElement, name, path

  if (args[1] instanceof HTMLElement) {
    [full_path, sourceElement] = args
  } else {
    [name, path, sourceElement] = args
    full_path = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path
  }

  asyncUpdate(full_path, sourceElement)
}

const _setForceUpdate = (fn) => _force_update = fn

export {
  // hack to eliminate circular dependency
  _setForceUpdate,
  asyncUpdate,
  getUpdateList,
  _trigger_change,
  _afterUpdate,
  afterUpdate,
  touchElement,
  touchByPath
}
