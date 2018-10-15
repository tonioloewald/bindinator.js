/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of
markup, style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.

## Core Functionality
- [require](#source=lib/require.js)
- [The Registry](#source=source/b8r.registry.js)
- [Binding Data](#source=source/b8r.bindings.js)
  - [toTargets](#source=source/b8r.toTargets.js)
  - [fromTargets](#source=source/b8r.fromTargets.js)
  - [keystroke](#source=source/b8r.keystroke.js)
- [Events](#source=source/b8r.events.js)
- [Components](#source=source/b8r.component.js)

## Utilities
- [AJAX](#source=source/b8r.ajax.js)
- [DOM Utilities](#source=source/b8r.dom.js)
- [Functions](#source=source/b8r.functions.js)
- [Iterators](#source=source/b8r.iterators.js)
- [Showing and Hiding](#source=source/b8r.show.js)
- [Performance Logging](#source=source/b8r.perf.js)
*/
/* jshint esnext:true, loopfunc:true, latedef:false, curly:false */
/* global console, require, module */

'use strict';
const { getByPath, pathSplit } = require('./b8r.byPath.js');

function b8r() {}

module.exports = b8r;

Object.assign(b8r, require('./b8r.dom.js'));
Object.assign(b8r, require('./b8r.perf.js'));
Object.assign(b8r, require('./b8r.iterators.js'));
const {
  on,
  off,
  enable,
  disable,
  callMethod,
  trigger,
  implicit_event_types,
  handle_event,
} = require('./b8r.events.js');
Object.assign(b8r, { on, off, enable, disable, callMethod, trigger });
const {
  addDataBinding,
  removeDataBinding,
  getDataPath,
  getListInstancePath,
  getComponentId,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings,
  resolveListInstanceBindings,
  splitPaths,
} = require('./b8r.bindings.js');
Object.assign(b8r, {addDataBinding, removeDataBinding, getDataPath, getComponentId, getListInstancePath});
const { saveDataForElement, dataForElement } =
  require('./b8r.dataForElement.js');
const {onAny, offAny, anyListeners} =
    require('./b8r.anyEvent.js');
Object.assign(b8r, { onAny, offAny, anyListeners });
Object.assign(b8r, require('./b8r.registry.js'));
b8r.observe(() => true, (path, source_element) => b8r.touchByPath(path, source_element));
const { keystroke, modifierKeys } = require('./b8r.keystroke.js');
b8r.keystroke = keystroke;
b8r.modifierKeys = modifierKeys;

Object.assign(b8r, require('./b8r.functions.js'));

b8r.cleanupComponentInstances = b8r.debounce(() => {
  // garbage collect models
  b8r.forEachKey(_component_instances, (element, component_id) => {
    if (!b8r.isInBody(element) || element.dataset.componentId !== component_id) {
      delete _component_instances[component_id];
    }
  });
  b8r.models().forEach(model => {
    if (model.substr(0, 2) === 'c#' && !_component_instances[model]) {
      b8r.call_if(`${model}.destroy`);
      b8r.remove(model, false);
    }
  });
}, 100);

const {
  async_update,
  get_update_list,
  after_update,
  touchElement,
  touchByPath,
  _after_update,
  _set_force_update,
} = require('./b8r.update.js');
Object.assign(b8r, {async_update, after_update, touchElement, touchByPath});

b8r.force_update = () => {
  let update_list;

  while(update_list = get_update_list()) { // eslint-disable-line no-cond-assign
    const lists = b8r.find('[data-list]').
                      map(elt => { return {elt, list_binding: elt.dataset.list}; });
    let binds = false; // avoid collecting elements before big list updates

    while(update_list.length) {
      const {path, source} = update_list.shift();
      try {
        if (path) {
          lists.
            filter(bound => bound.elt !== source && bound.list_binding.includes(path)).
            forEach(({elt}) => bindList(elt));

          if (! binds) binds = b8r.find('[data-bind]').
                                   map(elt => { return {elt, data_binding: elt.dataset.bind}; });

          binds.
            filter(bound => bound.elt !== source && bound.data_binding.includes(path)).
            forEach(rec => rec.dirty = true);
        } else {
          b8r.bindAll(source);
        }
      } catch (e) {
        console.error('update error', e, {path, source});
      }
    }
    if (binds) binds.forEach(({elt, dirty}) => dirty && bind(elt));
  }

  _after_update();
};

_set_force_update(b8r.force_update);

b8r.setByPath = function(...args) {
  let name, path, value, source_element;
  if (args.length === 2 && typeof args[1] === 'object' && !Array.isArray(args[1])) {
    [name, value] = args;
    b8r.forEachKey(value, (val, path) => b8r.setByPath(name, path, val));
    return;
  } else if (args.length === 2 || args[2] instanceof Element) {
    [path, value, source_element] = args;
    path = b8r.resolvePath(path, source_element);
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, source_element] = args;
  }
  if (b8r.registered(name)) {
    // const model = b8r.get(name);
    if (typeof path === 'object') {
      // Object.assign(model, path);
      // b8r.touchByPath(name, '/', source_element);
      b8r.set(name, path, source_element);
    } else {
      // setByPath(model, path, value);
      // b8r.touchByPath(name, path, source_element);
      b8r.set(
        path[0] === '[' || !path ?
        `${name}${path}` :
        `${name}.${path}`, value, source_element
      );
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`);
  }
};

b8r.pushByPath = function(...args) {
  let name, path, value, callback;
  if (args.length === 2 || typeof args[2] === 'function') {
    [path, value, callback] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, callback] = args;
  }
  if (b8r.registered(name)) {
    const list = b8r.get(path ? `${name}.${path}` : name);
    list.push(value);
    if (callback) {
      callback(list);
    }
    b8r.touchByPath(name, path);
  } else {
    console.error(`pushByPath failed; ${name} is not a registered model`);
  }
};

b8r.unshiftByPath = function(...args) {
  let name, path, value;
  if (args.length === 2) {
    [path, value] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value] = args;
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path);
    list.unshift(value);
    b8r.touchByPath(name, path);
  } else {
    console.error(`unshiftByPath failed; ${name} is not a registered model`);
  }
};

b8r.removeListInstance = function(elt) {
  elt = elt.closest('[data-list-instance]');
  if (elt) {
    const ref = elt.dataset.listInstance;
    try {
      const [, model, path, key] = ref.match(/^([^.]+)\.(.+)\[([^\]]+)\]$/);
      b8r.removeByPath(model, path, key);
    } catch (e) {
      console.error('cannot find list item for instance', ref);
    }
  } else {
    console.error('cannot remove list instance for', elt);
  }
};

function indexFromKey(list, key) {
  if (typeof key === 'number') {
    return key;
  }
  const [id_path, value] = key.split('=');
  return list.findIndex(elt => getByPath(elt, id_path) == value);
}

b8r.removeByPath = function(...args) {
  let name, path, key;
  if (args.length === 2) {
    [path, key] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, key] = args;
  }
  if (b8r.registered(name)) {
    const list = getByPath(b8r.get(name), path);
    const index = indexFromKey(list, key);
    if (Array.isArray(list) && index > -1) {
      list.splice(index, 1);
    } else {
      delete list[key];
    }
    b8r.touchByPath(name, path);
  }
};

b8r.getByPath = function(model, path) {
  return b8r.get(path ? model + (path[0] === '[' ? path : '.' + path) : model);
};

b8r.listItems = element =>
  b8r.makeArray(element.children)
    .filter(elt => elt.matches('[data-list-instance]'));
b8r.listIndex = element =>
  b8r.listItems(element.parentElement).indexOf(element);

b8r.getComponentData = (elt, type) => {
  const id = getComponentId(elt, type);
  return id ? b8r.get(id) : null;
};

b8r.setComponentData = (elt, path, value) => {
  const id = getComponentId(elt);
  b8r.setByPath(id, path, value);
};

b8r.getData = elt => {
  const dataPath = b8r.getDataPath(elt);
  return dataPath ? b8r.get(dataPath, elt) : null;
};

b8r.getListInstance = elt => {
  const instancePath = b8r.getListInstancePath(elt);
  return instancePath ? b8r.get(instancePath, elt) : null;
};

if (document.body) {
  implicit_event_types.
  forEach(type => document.body.addEventListener(type, handle_event, true));
} else {
  document.addEventListener('DOMContentLoaded', () => {
    implicit_event_types.
    forEach(type => document.body.addEventListener(type, handle_event, true));
  });
}

b8r.implicitlyHandleEventsOfType = type => {
  if (implicit_event_types.indexOf(type) === -1) {
    implicit_event_types.push(type);
    document.body.addEventListener(type, handle_event, true);
  }
};

const toTargets = require('./b8r.toTargets.js')(b8r);

b8r.onAny(['change', 'input'], '_b8r_._update_');

b8r.interpolate = (template, elt) => {
  let formatted = '';
  if (template.match(/\$\{.*?\}/)) {
    formatted = template.replace(/\$\{(.*?)\}/g, (_, path) => {
      const value = b8r.get(path, elt);
      return value !== null ? value : '';
    });
  } else {
    const paths = splitPaths(template);
    if (paths.indexOf('') > -1) {
      throw `empty path in binding ${template}`;
    }
    formatted = paths.map(path => b8r.get(path, elt));
    if (formatted.length === 1) {
      formatted = formatted[0];
    }
  }
  return formatted;
};

const _unequal = (a, b) => (a !== b) || (a && typeof a === 'object');


function bind(element) {
  if (element.closest('[data-component],[data-list]')) {
    return;
  }
  const bindings = getBindings(element);
  const boundValues = element._b8r_boundValues || (element._b8r_boundValues = {});
  const newValues = {};
  for (let i = 0; i < bindings.length; i++) {
    const { targets, path } = bindings[i];
    const value = b8r.interpolate(path, element);
    const existing = boundValues[path];
    if (_unequal(existing, value)) {
      newValues[path] = value;
      const _toTargets = targets.filter(t => toTargets[t.target]);
      if (_toTargets.length) {
        _toTargets.forEach(t => {
          toTargets[t.target](element, value, t.key);
        });
      } else {
        console.warn(`unrecognized toTarget in binding`, element, bindings[i]);
      }
    }
  }
  Object.assign(boundValues, newValues);
}

const { show, hide } = require('./b8r.show.js');
b8r.show = show;
b8r.hide = hide;

function removeListInstances(element) {
  while (element.previousSibling &&
         (!element.previousSibling.matches ||
          element.previousSibling.matches('[data-list-instance]'))) {
    element.parentElement.removeChild(element.previousSibling);
  }
}

b8r.listInstances = list_template => {
  const instances = [];
  let instance = list_template.previousSibling;
  while (instance && instance instanceof Element &&
         instance.matches('[data-list-instance]')) {
    instances.push(instance);
    instance = instance.previousSibling;
  }
  return instances.reverse();
};

const forEachItemIn = (obj, id_path, func) => {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      const item = obj[i];
      func(item, id_path ? `${id_path}=${getByPath(item, id_path)}` : i);
    }
  } else if (obj.constructor === Object) {
    if (id_path) {
      throw `id-path is not supported for objects bound as lists`;
    }
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      func(obj[key], `=${key}`);
    }
  } else if (obj !== null) {
    throw 'can only bind Array and Object instances as lists';
  }
};

let id_count = 0; // used to assign unique ids as required
function bindList(list_template, data_path) {
  list_template.classList.add('-b8r-empty-list');
  if (
    ! list_template.parentElement ||                            // skip if disembodied
    list_template.parentElement.closest('[data-component]') ||  // or it's in an unloaded component
    list_template.parentElement.closest('[data-list]')          // or it's in a list template
  ) {
    return;
  }
  const [source_path, id_path] = list_template.dataset.list.split(':');
  let method_path, list_path, arg_paths;
  try {
    // parse computed list method if any
    [, , method_path, arg_paths] =
      source_path.match(/^(([^()]*)\()?([^()]*)(\))?$/);
    arg_paths = arg_paths.split(',');
    list_path = arg_paths[0];
  } catch (e) {
    console.error('bindList failed; bad source path', source_path);
  }
  if (data_path) {
    list_path = data_path + list_path;
  }
  const resolved_path = b8r.resolvePath(list_path, list_template);
  // rewrite the binding if necessary (otherwise nested list updates fail)
  if (resolved_path !== list_path) {
    let list_binding = list_path = resolved_path;
    if (method_path) {
      arg_paths[0] = list_path;
      list_binding = `${method_path}(${arg_paths.join(',')})`;
    }
    list_template.dataset.list = id_path ? `${list_binding}:${id_path}` : list_binding;
  }
  let list = b8r.get(list_path);
  if (!list) {
    return;
  }
  // assign unique ids if no id-path is specified
  if (id_path === '_auto_') {
    for(let i = 0; i < list.length; i++) {
      if (!list[i]._auto_) {
        id_count += 1;
        list[i]._auto_ = id_count;
      }
    }
  }
  // compute list
  if (method_path) {
    if (!b8r.get(method_path)) {
      // method_path is not yet available; when it becomes available it will trigger
      // the binding so we can ignore it for now
      return;
    }
    (() => {
      try {
        const args = arg_paths.map(b8r.get);
        const filtered_list = b8r.callMethod(method_path, ...args, list_template);
        // debug warning for lists that get "filtered" into new objects
        if (
          Array.isArray(list) &&
          filtered_list.length &&
          list.indexOf(filtered_list[0]) === -1
        ) {
          console.warn(
            `list filter ${method_path} returned a new object` +
            ` (not from original list); this will break updates!`
          );
        }
        list = filtered_list;
      } catch (e) {
        console.error(`bindList failed, ${method_path} threw error`, e);
      }
    })();
    if (!list) {
      throw 'could not compute list; async filtered list methods not supported (yet)';
    }
  }

  b8r.show(list_template);
  if (!id_path) {
    removeListInstances(list_template);
  }
  // efficient list update:
  // if we have an id_path we grab existing instances, and re-use those with
  // matching ids
  const existing_list_instances = id_path ? b8r.listInstances(list_template) : [];
  const path_to_instance_map = {};
  if (existing_list_instances.length) {
    existing_list_instances.
    forEach(instance => {
      const path = instance.dataset.listInstance;
      const item = instance._b8r_listInstance;
      if (item && list.includes(item)) {
        path_to_instance_map[path] = instance;
      } else {
        instance.remove();
      }
    });
  }

  const template = list_template.cloneNode(true);
  template.classList.remove('-b8r-empty-list');
  delete template.dataset.list;

  /* Safari refuses to hide hidden options */
  if (list_template.tagName === 'OPTION') {
    list_template.setAttribute('disabled', '');
    list_template.textContent = '';
    template.removeAttribute('disabled');
  }

  let previous_instance = list_template;
  let instance;

  const ids = {};
  list_template.classList.toggle('-b8r-empty-list', ! list.length);
  forEachItemIn(list, id_path, (item, id) => {
    if (ids[id]) {
      console.warn(`${id} not unique ${id_path} in ${list_template.dataset.list}`);
      return;
    }
    ids[id] = true;
    const itemPath = `${list_path}[${id}]`;
    instance = path_to_instance_map[itemPath];
    let resolve_bindings = false;
    if (instance === undefined) {
      instance = template.cloneNode(true);
      instance.dataset.listInstance = itemPath;
      instance._b8r_listInstance = item;
      resolve_bindings = true;
      list_template.parentElement.insertBefore(instance, previous_instance);
    } else {
      delete path_to_instance_map[itemPath];
      if (instance.nextSibling !== previous_instance) {
        list_template.parentElement.insertBefore(instance, previous_instance);
      }
    }
    b8r.bindAll(instance);
    if (resolve_bindings) resolveListInstanceBindings(instance, itemPath);
    previous_instance = instance;
  });
  // for <select> elements and components whose possible values may be dictated by their children
  // we trigger a 'change' event in the parent element.
  b8r.trigger('change', list_template.parentElement);
  b8r.hide(list_template);
}

b8r.bindAll = (element, data_path) => {
  loadAvailableComponents(element, data_path);
  findBindables(element).forEach(elt => bind(elt));
  findLists(element).forEach(elt => bindList(elt, data_path));
  b8r.cleanupComponentInstances();
};

require('./b8r._b8r_.js')(b8r);
Object.assign(b8r, require('./b8r.ajax.js'));
Object.assign(b8r, require('./b8r.sort.js'));

b8r.preloadData = () => {
  if (! b8r.findOne('script[src*="preload.js"]')) return;
  const modules = require.preloadData(true).reduce((a, b) => a.concat(b), []);
  const components = [];
  Object.keys(component_preload_map).forEach(name => {
    const path = component_preload_map[name];
    components.push ({name, path});
  });
  const data = {
    modules,
    components: components.sort((a, b) => b8r.sortAscending(a.name, b.name)) };

  if (window.__b8r_server_debug) {
    console.log('%c%s', 'color: white; background: #0a0', 'sending preload data');
    b8r.json('/__preload', 'POST', data);
  } else if (
    require.electron &&
    require.electron.remote.process.defaultApp
  ) {
    console.log('%c%s', 'color: white; background: #0a0', 'writing preload data');
    // using lazy to avoid changing dependency tree
    require.lazy('../lib/fs-promises.js').then(({save}) => {
      save('preload-electron.json', JSON.stringify(data, false, 2));
    });
  }

  return JSON.stringify(data, false, 2);
};

if (require.onSyncLoad) require.onSyncLoad(b8r.debounce(b8r.preloadData, 2000));

b8r.preload = (path='preload.components.json') => new Promise((resolve) => {
  b8r.json(path).then(components => {
    components.forEach(({name, path, source}) => {
      try {
        b8r.makeComponent(name, source, path);
      } catch(e) {
        console.error(`${path} failed to preload`, e);
      }
    });
    resolve();
  }).catch(resolve);
});

const _path_relative_b8r = _path => {
  return !_path ? b8r : Object.assign({}, b8r, {
    _path,
    component: (...args) => {
      const path_index = args[1] ? 1 : 0;
      let url = args[path_index];
      if (url.indexOf('://') === -1) {
        url = `${_path}/${url}`;
        args[path_index] = url;
      }
      return b8r.component(...args);
    }
  });
};

const {
  component,
  components,
  component_timeouts,
  component_preload_map,
  makeComponent
} = require('./b8r.component.js');
Object.assign(b8r, {component, makeComponent});

b8r.components = () => Object.keys(components);

function loadAvailableComponents(element, data_path) {
  b8r.findWithin(element || document.body, '[data-component]', true)
    .forEach(target => {
      if (!target.closest('[data-list]') &&
          !target.dataset.componentId) {
        const name = target.dataset.component;
        b8r.insertComponent(name, target, data_path);
      }
    });
}

const inheritData = element => {
  const reserved = ['destroy']; // reserved lifecycle methods
  const source = element.closest('[data-path],[data-list-instance],[data-component-id]');
  if (! source) {
    return null;
  } else {
    const data = b8r.get(source.dataset.componentId || b8r.getDataPath(source));
    return b8r.filterObject(
      data || {},
      (v, k) => (! reserved.includes(k)) || typeof v !== 'function'
    );
  }
};

let component_count = 0;
const _component_instances = {};
b8r.insertComponent = function(component, element, data) {
  const data_path = typeof data === 'string' ? data : b8r.getDataPath(element);
  if (!element) {
    element = b8r.create('div');
  } else if (! b8r.isInBody(element)) {
    return;
  }
  if (typeof component === 'string') {
    if (!components[component]) {
      if (!component_timeouts[component]) {
        // if this doesn't happen for five seconds, we have a problem
        component_timeouts[component] = setTimeout(
          () => console.error('component timed out: ', component), 5000);
      }
      if (data) {
        saveDataForElement(element, data);
      }
      element.dataset.component = component;
      return;
    }
    component = components[component];
  }
  if (element.dataset.component) {
    delete element.dataset.component;
  }
  if (!data || data_path) {
    data = dataForElement(element) || inheritData(element) || {};
  }
  if (element.parentElement === null) {
    document.body.appendChild(element);
  }
  const children = b8r.fragment();
  /*
    * if you're replacing a component, it should get the replaced component's children.
    * we probably want to be able to remove a component (i.e. pull out an instance's
      children and then delete element's contents, replace the children, and remove
      its id)
    * note that components with no DOM nodes present a problem since they may have
      passed-through child elements that aren't distinguishable from a component's
      original body
  */
  const component_id = 'c#' + component.name + '#' + (++component_count);
  if (component.view.children.length) {
    if (element.dataset.componentId) {
      if (element.querySelector('[data-children]')) {
        b8r.moveChildren(element.querySelector('[data-children]'), children);
      } else {
        b8r.empty(element);
      }
    } else {
      b8r.moveChildren(element, children);
    }
    const source = component.view.querySelector('[data-parent]') || component.view;
    b8r.copyChildren(source, element);
    replaceInBindings(element, '_component_', component_id);
    if (data_path) {
      replaceInBindings(element, '_data_', data_path);
    }
    const children_dest = b8r.findOneWithin(element, '[data-children]');
    if (children.firstChild && children_dest) {
      b8r.empty(children_dest);
      b8r.moveChildren(children, children_dest);
    }
  }
  element.dataset.componentId = component_id;
  _component_instances[component_id] = element;
  b8r.makeArray(element.classList).forEach(c => {
    if (c.substr(-10) === '-component') {
      element.classList.remove(c);
    }
  });
  element.classList.add(component.name + '-component');
  if (data_path) {
    element.dataset.path = data_path;
  }
  const register = component_data => b8r.register(component_id, component_data);
  data = Object.assign({}, data, {data_path, component_id});
  if (component.load) {
    const get = path => b8r.getByPath(component_id, path);
    const set = (...args) => {
      b8r.setByPath(component_id, ...args);
      // updates value bindings
      if (args[0] === 'value' || args[0].hasOwnProperty('value')) {
        b8r.trigger('change', element);
      }
    };
    const on = (...args) => b8r.on(element, ...args);
    const touch = path => b8r.touchByPath(component_id, path);
    b8r.register(component_id, data, true);
    try {
      component.load(
        require.relative(component.path),
        element, _path_relative_b8r(component.path), selector => b8r.findWithin(element, selector),
        selector => b8r.findOneWithin(element, selector), data, register,
        get, set, on, touch, component
      );
    } catch(e) {
      debugger; // eslint-disable-line no-debugger
      console.error('component', component.name, 'failed to load', e);
    }
  } else {
    b8r.register(component_id, data, true);
  }
  b8r.bindAll(element);
};

b8r.wrapWithComponent = (component, element, data, attributes) => {
  const wrapper = b8r.create('div');
  if (attributes) {
    b8r.forEachKey(attributes, (val, prop) => wrapper.setAttribute(prop, val));
  }
  b8r.wrap(element, wrapper);
  b8r.insertComponent(component, wrapper, data);
  return wrapper;
};

b8r.removeComponent = elt => {
  if (elt.dataset.componentId) {
    delete elt.dataset.componentId;
    b8r.makeArray(elt.classList).forEach(c => {
      if (/-component$/.test(c)) {
        elt.classList.remove(c);
        b8r.empty(elt);
      }
    });
    b8r.cleanupComponentInstances();
  }
};

b8r.componentOnce = function(...args) {
  // may be switched out for relative version
  this.component(...args).then(c => {
    if (!b8r.findOne(`[data-component-id*="${c.name}"]`)) {
      b8r.insertComponent(c);
    }
  });
};
