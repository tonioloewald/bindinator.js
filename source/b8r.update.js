/**
# Async Update Queue

When data changes "out of b8r's sight" you may need to inform b8r of the change so it can
make appropriate changes to the DOM.

    touchByPath('path.to.data'); // tells b8r to update anything bound to that path
    touchByPath('path.to.data', source_element); // as above, but exclude source_element
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
pass a callback to `after_update`:

    after_update(() => { ... }); // does stuff after force_update fires

after_update fires immediately (and synchronously) if there are no pending updates.
*/

import { dispatch } from './b8r.dispatch.js'

const _change_list = []
let _update_frame = null
const _update_list = []
const _after_update_callbacks = []
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

const get_update_list = () => {
  if (_update_frame) {
    _update_frame.cancel()
    _update_frame = null
    return _update_list.splice(0)
  } else {
    if (_update_list.length) {
      throw '_update_list is not empty but no _update_frame set'
    }
    return false
  }
}

const _after_update = () => {
  while (_after_update_callbacks.length) {
    let fn
    try {
      fn = _after_update_callbacks.shift()
      fn()
    } catch (e) {
      console.error('_after_update_callback error', e, fn)
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

const async_update = (path, source) => {
  const item = path
    ? _update_list.find(item => path.startsWith(item.path))
    : _update_list.find(item => (!item.path) && item.source && item.source === source)
  if (!item) {
    if (!_update_frame) {
      _update_frame = requestAnimationFrameWithTimeout(_force_update)
    }
    _update_list.push({ path, source })
  } else if (path) {
    // if the path was already marked for update, then the new source element is (now) correct
    item.source = source
  }
}

const after_update = callback => {
  if (_update_list.length) {
    if (_after_update_callbacks.indexOf(callback) === -1) {
      _after_update_callbacks.push(callback)
    }
  } else {
    callback()
  }
}

const touchElement = element => async_update(false, element)

const touchByPath = (...args) => {
  let full_path, source_element, name, path

  if (args[1] instanceof HTMLElement) {
    [full_path, source_element] = args
  } else {
    [name, path, source_element] = args
    full_path = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path
  }

  async_update(full_path, source_element)
}

const _set_force_update = (fn) => _force_update = fn

export {
  // hack to eliminate circular dependency
  _set_force_update,
  async_update,
  get_update_list,
  _trigger_change,
  _after_update,
  after_update,
  touchElement,
  touchByPath
}
