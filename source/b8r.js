/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of
markup, style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.

## Core Functionality
- [The Registry](?source=source/b8r.registry.js)
- [Binding Data](?source=source/b8r.bindings.js)
  - [sending data to the DOM](?source=source/b8r.toTargets.js)
  - [capturing data changes from the DOM](?source=source/b8r.fromTargets.js)
- [Events](?source=source/b8r.events.js)
  - [keystroke](?source=source/b8r.keystroke.js)
- [Components](?source=source/b8r.component.js)

## Utilities
- [AJAX](?source=source/b8r.ajax.js)
- [DOM Utilities](?source=source/b8r.dom.js)
- [Functions](?source=source/b8r.functions.js)
- [Iterators](?source=source/b8r.iterators.js)
- [Showing and Hiding](?source=source/b8r.show.js)
*/
/* jshint esnext:true, loopfunc:true, latedef:false, curly:false */
/* global console, Element, HTMLElement */

import * as constants from './b8r.constants.js'
import { getByPath, pathSplit } from './b8r.byPath.js'
import * as _dom from './b8r.dom.js'
import * as _iterators from './b8r.iterators.js'
import * as _registry from './b8r.registry.js'
import * as _byExample from './b8r.byExample.js'
import * as _functions from './b8r.functions.js'
import _toTargets from './b8r.toTargets.js'
import * as _ajax from './b8r.ajax.js'
import * as _sort from './b8r.sort.js'
import {
  on,
  off,
  enable,
  disable,
  trigger,
  callMethod,
  implicitEventTypes,
  implicitlyHandleEventsOfType,
  handleEvent
} from './b8r.events.js'
import { _insertSet, _insertFromTargets } from './b8r._b8r_.js'
import * as fromTargets from './b8r.fromTargets.js'
import {
  addDataBinding,
  removeDataBinding,
  getDataPath,
  getListPath,
  getListInstancePath,
  getComponentId,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings,
  resolveListInstanceBindings,
  splitPaths
} from './b8r.bindings.js'
import { saveDataForElement, dataForElement } from './b8r.dataForElement.js'
import { onAny, offAny, anyListeners } from './b8r.anyEvent.js'
import { keystroke, modifierKeys } from './b8r.keystroke.js'

import {
  asyncUpdate,
  getUpdateList,
  afterUpdate,
  touchElement,
  touchByPath,
  _afterUpdate,
  _setForceUpdate,
  expectCustomElement
} from './b8r.update.js'

import { show, hide } from './b8r.show.js'

import {
  component,
  components,
  componentTimeouts,
  makeComponent,
  makeComponentNoEval
} from './b8r.component.js'

import * as webComponents from './web-components.js'

let uniqueId = 0
const unique = () => uniqueId++

// TODO seal b8r after it's been built

const b8r = { constants, unique }
const UNLOADED_COMPONENT_SELECTOR = '[data-component],b8r-component:not([data-component-id])'
const UNREADY_SELECTOR = `[data-list],${UNLOADED_COMPONENT_SELECTOR}`

Object.assign(b8r, _dom)
Object.assign(b8r, _iterators)
Object.assign(b8r, { on, off, enable, disable, trigger, callMethod, implicitlyHandleEventsOfType })
Object.assign(b8r, { addDataBinding, removeDataBinding, getDataPath, getComponentId, getListPath, getListInstancePath })
Object.assign(b8r, { onAny, offAny, anyListeners })
Object.assign(b8r, _registry)
Object.assign(b8r, _byExample)
b8r.observe(() => true, (path, sourceElement) => touchByPath(path, sourceElement))
b8r.keystroke = keystroke
b8r.modifierKeys = modifierKeys
b8r.webComponents = webComponents
Object.assign(b8r, _functions)

b8r.cleanupComponentInstances = b8r.debounce(() => {
  // garbage collect models
  b8r.forEachKey(_componentInstances, (element, componentId) => {
    if (!b8r.isInBody(element) || element.dataset.componentId !== componentId) {
      delete _componentInstances[componentId]
    }
  })
  b8r.models().forEach(model => {
    if (model.substr(0, 2) === 'c#' && !_componentInstances[model]) {
      b8r.callIf(`${model}.destroy`)
      b8r.remove(model, false)
    }
  })
}, 100)
Object.assign(b8r, { asyncUpdate, afterUpdate, touchElement })

b8r.forceUpdate = () => {
  let updateList

  while (updateList = getUpdateList()) { // eslint-disable-line no-cond-assign
    const lists = b8r.find('[data-list]')
      .map(elt => ({ elt, listBinding: elt.dataset.list }))
    let binds = false // avoid collecting elements before big list updates

    while (updateList.length) {
      const { path, source } = updateList.shift()
      try {
        if (path) {
          lists
            .filter(bound => bound.elt !== source && bound.listBinding.includes(path))
            .forEach(({ elt }) => bindList(elt))

          if (!binds) {
            binds = b8r.find('[data-bind]')
              .map(elt => { return { elt, data_binding: elt.dataset.bind } })
          }

          binds
            .filter(bound => bound.elt !== source && bound.data_binding.includes(path))
            .forEach(rec => {
              rec.dirty = true
            })
        } else {
          b8r.bindAll(source)
        }
      } catch (e) {
        console.error('update error', e, { path, source })
      }
    }
    if (binds) binds.forEach(({ elt, dirty }) => dirty && bind(elt))
  }

  b8r.cleanupComponentInstances()

  _afterUpdate()
}

_setForceUpdate(b8r.forceUpdate)

b8r.setByPath = function (...args) {
  let name, path, value, sourceElement
  if (args.length === 2 && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    [name, value] = args
    b8r.forEachKey(value, (val, path) => b8r.setByPath(name, path, val))
    return
  } else if (args.length === 2 || args[2] instanceof Element) {
    [path, value, sourceElement] = args
    path = b8r.resolvePath(path, sourceElement);
    [name, path] = pathSplit(path)
  } else {
    [name, path, value, sourceElement] = args
  }
  if (b8r.registered(name)) {
    if (typeof path === 'object') {
      b8r.set(name, path, sourceElement)
    } else {
      b8r.set(
        path[0] === '[' || !path
          ? `${name}${path}`
          : `${name}.${path}`, value, sourceElement
      )
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`)
  }
}

_insertSet(b8r.set)
_insertFromTargets(fromTargets)

const _touchPath = (model, path) => {
  b8r.touch(model + (path.startsWith('[') ? path : '.' + path))
}

b8r.pushByPath = function (...args) {
  let name, path, value, callback
  if (args.length === 2 || typeof args[2] === 'function') {
    [path, value, callback] = args;
    [name, path] = pathSplit(path)
  } else {
    [name, path, value, callback] = args
  }
  if (b8r.registered(name)) {
    const list = b8r.get(path ? `${name}.${path}` : name)
    list.push(value)
    if (callback) {
      callback(list)
    }
    _touchPath(name, path)
  } else {
    console.error(`pushByPath failed; ${name} is not a registered model`)
  }
}

b8r.unshiftByPath = function (...args) {
  let name, path, value
  if (args.length === 2) {
    [path, value] = args;
    [name, path] = pathSplit(path)
  } else {
    [name, path, value] = args
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path)
    list.unshift(value)
    _touchPath(name, path)
  } else {
    console.error(`unshiftByPath failed; ${name} is not a registered model`)
  }
}

b8r.removeListInstance = function (elt) {
  elt = elt.closest('[data-list-instance]')
  if (elt) {
    const ref = elt.dataset.listInstance
    try {
      const [, model, path, key] = ref.match(/^([^.]+)\.(.+)\[([^\]]+)\]$/)
      b8r.removeByPath(model, path, key)
    } catch (e) {
      console.error('cannot find list item for instance', ref)
    }
  } else {
    console.error('cannot remove list instance for', elt)
  }
}

function indexFromKey (list, key) {
  if (typeof key === 'number') {
    return key
  }
  const [idPath, value] = key.split('=')
  return list.findIndex(elt => `${getByPath(elt, idPath)}` === value)
}

b8r.removeByPath = function (...args) {
  let name, path, key
  if (args.length === 2) {
    [path, key] = args;
    [name, path] = pathSplit(path)
  } else {
    [name, path, key] = args
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path)
    const index = indexFromKey(list, key)
    if (Array.isArray(list) && index > -1) {
      list.splice(index, 1)
    } else {
      delete list[key]
    }
    _touchPath(name, path)
  }
}

b8r.listItems = element =>
  b8r.makeArray(element.children)
    .filter(elt => elt.matches('[data-list-instance]'))

b8r.listIndex = element =>
  b8r.listItems(element.parentElement).indexOf(element)

b8r.getComponentData = (elt, type) => {
  const id = getComponentId(elt, type)
  return id ? b8r.get(id) : null
}

b8r.setComponentData = (elt, path, value) => {
  const id = getComponentId(elt)
  b8r.setByPath(id, path, value)
}

b8r.getData = elt => {
  const dataPath = b8r.getDataPath(elt)
  return dataPath ? b8r.get(dataPath, elt) : null
}

b8r.getListInstance = elt => {
  const instancePath = b8r.getListInstancePath(elt)
  return instancePath ? b8r.get(instancePath, elt) : null
}

b8r.setListInstance = (elt, mutation) => {
  const instance = b8r.getListInstance(elt)
  const path = b8r.getListInstancePath(elt)
  const mutated = mutation(instance)
  b8r.set(path, mutated)
  b8r.find(`[data-list-instance="${path}"]`).forEach(b8r.touchElement)
}

b8r.getListTemplate = elt => {
  elt = elt.closest('[data-list-instance]')
  do {
    elt = elt.nextElementSibling
  } while (!elt.matches('[data-list]'))
  return elt
}

if (document.body) {
  implicitEventTypes
    .forEach(type => document.body.addEventListener(type, handleEvent, true))
} else {
  document.addEventListener('DOMContentLoaded', () => {
    implicitEventTypes
      .forEach(type => document.body.addEventListener(type, handleEvent, true))
  })
}

const toTargets = _toTargets(b8r)

b8r.onAny(['change', 'input'], '_b8r_._update_')

b8r.interpolate = (template, elt) => {
  let formatted
  if (template.match(/\$\{[^{]*?\}/)) {
    formatted = template
    do {
      formatted = formatted.replace(/\$\{([^{]*?)\}/g, (_, path) => {
        const value = b8r.get(path, elt)
        return value !== null ? value : ''
      })
    } while (formatted.match(/\$\{[^{]*?\}/))
  } else {
    const paths = splitPaths(template)
    if (paths.indexOf('') > -1) {
      throw new Error(`empty path in binding ${template}`)
    }
    formatted = paths.map(path => b8r.get(path, elt))
    if (formatted.length === 1) {
      formatted = formatted[0]
    }
  }
  return formatted
}

const _unequal = (a, b) => (a !== b) || (a && typeof a === 'object')

function bind (element) {
  if (element.tagName.includes('-') && element.constructor === HTMLElement) {
    expectCustomElement(element.tagName)
    return // do not attempt to bind to custom components before they are defined
  }
  if (element.closest(UNREADY_SELECTOR)) {
    return
  }
  const bindings = getBindings(element)
  const boundValues = element._b8rBoundValues || (element._b8rBoundValues = {})
  const newValues = {}
  for (let i = 0; i < bindings.length; i++) {
    const { targets, path } = bindings[i]
    const value = b8r.interpolate(path, element)
    const existing = boundValues[path]
    if (_unequal(existing, value)) {
      newValues[path] = value
      const _toTargets = targets.filter(t => toTargets[t.target])
      if (_toTargets.length) {
        _toTargets.forEach(t => {
          toTargets[t.target](element, value, t.key)
        })
      } else {
        console.warn('unrecognized toTarget in binding', element, bindings[i])
      }
    }
  }
  Object.assign(boundValues, newValues)
}
b8r.show = show
b8r.hide = hide

const forEachItemIn = (obj, idPath, func) => {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i]
      func(item, idPath ? `${idPath}=${getByPath(item, idPath)}` : i)
    }
  } else if (obj.constructor === Object) {
    if (idPath) {
      throw new Error('id-path is not supported for objects bound as lists')
    }
    const keys = Object.keys(obj)
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i]
      func(obj[key], `=${key}`)
    }
  } else if (obj !== null) {
    throw new Error('can only bind Array and Object instances as lists')
  }
}

function bindList (listTemplate) {
  listTemplate.classList.add('-b8r-empty-list')
  if (
    !listTemplate.parentElement || // skip if disembodied
    listTemplate.parentElement.closest(UNREADY_SELECTOR)
  ) {
    return
  }
  const [sourcePath, idPath] = listTemplate.dataset.list.split(':')
  let methodPath, listPath, argPaths
  try {
    // parse computed list method if any
    [, , methodPath, argPaths] =
      sourcePath.match(/^(([^()]*)\()?([^()]*)(\))?$/)
    argPaths = argPaths.split(',')
    listPath = argPaths[0]
  } catch (e) {
    console.error('bindList failed; bad source path', sourcePath)
  }
  const resolvedPath = b8r.resolvePath(listPath, listTemplate)
  // rewrite the binding if necessary (otherwise nested list updates fail)
  if (resolvedPath !== listPath) {
    let listBinding = listPath = resolvedPath
    if (methodPath) {
      argPaths.shift()
      argPaths = [listPath, ...argPaths.map(path => b8r.resolvePath(path, listTemplate))]
      listBinding = `${methodPath}(${argPaths.join(',')})`
    }
    listTemplate.dataset.list = idPath ? `${listBinding}:${idPath}` : listBinding
  }
  let list = b8r.get(listPath)
  if (!list) {
    return
  }
  if (methodPath && !idPath) {
    throw new Error(`data-list="${listTemplate.dataset.list}" -- computed list requires id-path`)
  }
  // compute list
  if (methodPath) {
    if (!b8r.get(methodPath)) {
      // methodPath is not yet available; when it becomes available it will trigger
      // the binding so we can ignore it for now
      return
    }
    (() => {
      try {
        const args = argPaths.map(b8r.get)
        const filteredList = b8r.callMethod(methodPath, ...args, listTemplate)
        // debug warning for lists that get "filtered" into new objects
        if (
          Array.isArray(list) &&
          filteredList.length &&
          list.indexOf(filteredList[0]) === -1
        ) {
          console.warn(
            `list filter ${methodPath} returned a new object` +
            ' (not from original list); this will break updates!'
          )
        }
        list = filteredList
      } catch (e) {
        console.error(`bindList failed, ${methodPath} threw error`, e)
      }
    })()
    if (!list) {
      throw new Error('could not compute list; async filtered list methods not supported (yet)')
    }
  }
  // assign unique ids if _auto_ id-path is specified
  if (idPath === '_auto_') {
    for (let i = 0; i < list.length; i++) {
      if (list[i]._auto_ === undefined) {
        list[i]._auto_ = unique()
      }
    }
  }

  b8r.show(listTemplate)
  // efficient list update:
  // if we have an idPath we grab existing instances, and re-use those with
  // matching ids
  const existingListInstances = listTemplate._b8rListInstances || {}
  const listInstances = listTemplate._b8rListInstances = {}

  const template = listTemplate.cloneNode(true)
  template.classList.remove('-b8r-empty-list')
  if (template.classList.length === 0) template.removeAttribute('class')
  delete template.dataset.list

  /* Safari refuses to hide hidden options */
  if (listTemplate.tagName === 'OPTION') {
    listTemplate.setAttribute('disabled', '')
    listTemplate.textContent = ''
    template.removeAttribute('disabled')
  }

  let previousInstance = listTemplate
  let instance
  let listContentChanged = false

  const ids = {}
  listTemplate.classList.toggle('-b8r-empty-list', !list.length)
  forEachItemIn(list, idPath, (item, id) => {
    if (ids[id]) {
      console.warn(`${id} not unique ${idPath} in ${listTemplate.dataset.list}`)
      return
    }
    ids[id] = true
    const itemPath = `${listPath}[${id}]`
    instance = existingListInstances[itemPath]
    if (instance === undefined) {
      listContentChanged = true
      instance = template.cloneNode(true)
      instance.dataset.listInstance = itemPath
      instance._b8rListInstance = item
      listTemplate.parentElement.insertBefore(instance, previousInstance)
      resolveListInstanceBindings(instance, itemPath)
      b8r.bindAll(instance)
    } else {
      delete existingListInstances[itemPath]
      if (instance.nextSibling !== previousInstance) {
        listTemplate.parentElement.insertBefore(instance, previousInstance)
      }
    }
    listInstances[itemPath] = instance
    previousInstance = instance
  })
  b8r.forEachKey(existingListInstances, elt => {
    listContentChanged = true
    elt.remove()
  })
  // for <select> elements and components whose possible values may be dictated by their children
  // we trigger a 'change' event in the parent element.
  if (listContentChanged) b8r.trigger('change', listTemplate.parentElement)
  b8r.hide(listTemplate)
}

b8r.bindAll = element => {
  loadAvailableComponents(element)
  findBindables(element).forEach(bind)
  findLists(element).forEach(bindList)
}

Object.assign(b8r, _ajax)
Object.assign(b8r, _sort)

b8r.onRequest(() => {
  if (b8r.registered('b8rRequestInFlight')) {
    b8r.set('b8rRequestInFlight', b8r.ajaxRequestsInFlight())
  } else {
    b8r.register('b8rRequestInFlight', b8r.ajaxRequestsInFlight())
  }
})

const _pathRelativeB8r = _path => {
  return !_path ? b8r : Object.assign({}, b8r, {
    _path,
    component: (...args) => {
      const pathIndex = args[1] ? 1 : 0
      let url = args[pathIndex]
      if (url.indexOf('://') === -1) {
        url = `${_path}/${url}`
        args[pathIndex] = url
      }
      return b8r.component(...args)
    }
  })
}
Object.assign(b8r, { component, makeComponent, makeComponentNoEval })

b8r.components = () => Object.keys(components)

function loadAvailableComponents (element) {
  b8r.findWithin(element || document.body, UNLOADED_COMPONENT_SELECTOR, true)
    .forEach(target => {
      if (!target.closest('[data-list]')) {
        const name = target.tagName === 'B8R-COMPONENT'
          ? target.name
          : target.dataset.component
        if (name) b8r.insertComponent(name, target)
      }
    })
}

b8r._DEPRECATED_COMPONENTS_PASS_DOWN_DATA = false
const inheritData = element => {
  const reserved = ['destroy'] // reserved lifecycle methods
  const selector = b8r._DEPRECATED_COMPONENTS_PASS_DOWN_DATA
    ? '[data-path],[data-list-instance],[data-component-id]'
    : '[data-path],[data-list-instance]'
  const source = element.closest(selector)
  if (!source) {
    return null
  } else {
    const data = b8r.get(source.dataset.componentId || b8r.getDataPath(source))
    return b8r.filterObject(
      data || {},
      (v, k) => (!reserved.includes(k)) || typeof v !== 'function'
    )
  }
}

let componentCount = 0
const _componentInstances = {}
b8r.insertComponent = async function (component, element, data) {
  if (!component) {
    throw new Error('insertComponent requires a component')
  }
  const dataPath = typeof data === 'string' ? data : b8r.getDataPath(element)
  if (!element) {
    element = b8r.create('div')
  } else if (!b8r.isInBody(element)) {
    return
  }
  if (typeof component === 'string') {
    if (!components[component]) {
      if (!componentTimeouts[component]) {
        // if this doesn't happen for five seconds, we have a problem
        componentTimeouts[component] = setTimeout(
          () => console.error('component timed out: ', component), 5000)
      }
      if (data) {
        saveDataForElement(element, data)
      }
      element.dataset.component = component
      return
    }
    component = components[component]
  }
  const className = component.name + '-component'
  if (element.classList.contains(className)) return
  if (element.dataset.component) {
    delete element.dataset.component
  }
  if (!data || dataPath) {
    data = dataForElement(element) || inheritData(element) || {}
  }
  if (element.parentElement === null) {
    document.body.appendChild(element)
  }
  const children = b8r.fragment()
  /*
    * if you're replacing a component, it should get the replaced component's children.
    * we probably want to be able to remove a component (i.e. pull out an instance's
      children and then delete element's contents, replace the children, and remove
      its id)
    * note that components with no DOM nodes present a problem since they may have
      passed-through child elements that aren't distinguishable from a component's
      original body
  */
  const componentId = 'c#' + component.name + '#' + (++componentCount)
  if (component.view.children.length) {
    if (element.dataset.componentId) {
      if (element.querySelector('[data-children]')) {
        b8r.moveChildren(element.querySelector('[data-children]'), children)
      } else {
        b8r.empty(element)
      }
    } else {
      b8r.moveChildren(element, children)
    }
    // [data-parent] supports DOM elements such as <tr> that can only "live" in a specific context
    const source = component.view.querySelector('[data-parent]') || component.view
    b8r.copyChildren(source, element)
    replaceInBindings(element, '_component_', componentId)
    if (dataPath) {
      replaceInBindings(element, '_data_', dataPath)
    }
    const childrenDest = b8r.findOneWithin(element, '[data-children]')
    if (children.firstChild && childrenDest) {
      b8r.empty(childrenDest)
      b8r.moveChildren(children, childrenDest)
    }
  }
  b8r.makeArray(element.classList).forEach(c => {
    if (c.substr(-10) === '-component') {
      element.classList.remove(c)
    }
  })
  const get = path => b8r.getByPath(componentId, path)
  const set = (...args) => {
    b8r.setByPath(componentId, ...args)
    // updates value bindings
    if (args[0] === 'value' || Object.prototype.hasOwnProperty.call(args[0], 'value')) {
      b8r.trigger('change', element)
    }
  }
  const register = componentData => {
    console.warn('use of register withi components is deprecated, use set() instead')
    set(componentData)
  }
  const touch = path => _touchPath(componentId, path)
  const on = (...args) => b8r.on(element, ...args)
  const find = selector => b8r.findWithin(element, selector)
  const findOne = selector => b8r.findOneWithin(element, selector)
  const initialValue = typeof component.initialValue === 'function'
    ? await component.initialValue({ b8r, get, set, touch, on, component: element, findOne, find })
    : b8r.deepClone(component.initialValue) || data
  data = {
    ...(component.type ? b8r.deepClone(component.type) : {}),
    ...initialValue,
    dataPath,
    componentId
  }
  b8r.register(componentId, data, true)
  element.classList.add(className)
  element.dataset.componentId = componentId
  _componentInstances[componentId] = element
  if (component.load) {
    try {
      await component.load(
        element, _pathRelativeB8r(component.path), find, findOne,
        b8r.reg[componentId], register, get, set, on, touch, component
      )
    } catch (e) {
      debugger // eslint-disable-line no-debugger
      console.error('component', component.name, 'failed to load', e)
    }
  }
  b8r.bindAll(element)
}

b8r.Component = b8r.webComponents.makeWebComponent('b8r-component', {
  attributes: {
    name: '',
    path: '',
    value: null
  },
  content: false,
  props: {
    componentId: function () {
      return this.dataset.componentId
    },
    data: function () {
      return b8r.reg[this.dataset.componentId]
    }
  },
  methods: {
    connectedCallback () {
      const { path } = this
      if (path) {
        if (!this.name) this.name = path.split('/').pop().split('.').shift()
        b8r.component(this.name, path)
      }
    },
    set (...args) {
      b8r.setByPath(this.componentId, ...args)
    },
    render () {
      if (!this.isConnected) return
      const unready = this.parentElement && this.parentElement.closest(UNREADY_SELECTOR)
      if (unready) return
      if (this.name) {
        b8r.insertComponent(this.name, this)
      } else {
        b8r.removeComponent(this)
      }
    }
  }
})

b8r.wrapWithComponent = (component, element, data, attributes) => {
  const wrapper = b8r.create('div')
  if (attributes) {
    b8r.forEachKey(attributes, (val, prop) => wrapper.setAttribute(prop, val))
  }
  b8r.wrap(element, wrapper)
  b8r.insertComponent(component, wrapper, data)
  return wrapper
}

b8r.removeComponent = elt => {
  if (elt.dataset.componentId) {
    delete elt.dataset.componentId
    b8r.makeArray(elt.classList).forEach(c => {
      if (/-component$/.test(c)) {
        elt.classList.remove(c)
        b8r.empty(elt)
      }
    })
    b8r.cleanupComponentInstances()
  }
}

b8r.componentOnce = async (...args) => {
  const c = await b8r.component(...args)
  if (!b8r.findOne(`[data-component-id*="${c.name}"]`)) {
    await b8r.insertComponent(c)
  }
}

Object.freeze(b8r)

export default b8r
