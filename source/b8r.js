/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Binds data and methods to the DOM and lets you quickly turn chunks of markup, style, and code
into reusable components so you can concentrate on your project.
*/
/* jshint esnext:true, loopfunc:true */
/* globals console, window, require, module, KeyboardEvent */

(function(module){
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');

function b8r(){}

module.exports = b8r;

const {
  find,
  findOne,
  findWithin,
  findOneWithin,
  findAbove,
  id,
  text,
  fragment,
  create,
  classes,
  empty,
  elementIndex,
  moveChildren,
  copyChildren
} = require('./b8r.dom.js');

b8r.find = find;
b8r.findOne = findOne;
b8r.findWithin = findWithin;
b8r.findOneWithin = findOneWithin;
b8r.findAbove = findAbove;
b8r.id = id;
b8r.text = text;
b8r.fragment = fragment;
b8r.create = create;
b8r.classes = classes;
b8r.empty = empty;
b8r.elementIndex = elementIndex;
b8r.moveChildren = moveChildren;
b8r.copyChildren = copyChildren;

b8r.modifierKeys = {
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  escape: '⎋',
  shift: '⇧',
};

const models = {};
const noop = () => {};

/**
    b8r.register(name, obj);

register an object by name as data or controller.
The names `_component_` and `_b8r_` are reserved; other similar namess may be reserved later.

Binding to explicitly means you will only be bound to an explicit object
`_b8r_` is the name of the internal event handlers for bound variables

    b8r.deregister(name);

Remove a registered object. deregister also removes component instance objects for components no longer in the DOM,
(and it can also be called without any parameters)

    b8r.setByPath('model', 'data.path, value);
    b8r.setByPath('model.data.path', value);

Set a registered object's property by path. Bound elements will automatically be updated.

    b8r.getByPath('model', 'data.path');
    b8r.getByPath('model.data.path');

Get a registered object's property by path.

    b8r.pushByPath('model', 'data.path', item, callback);
    b8r.pushByPath('model.data.path', item, callback);

As above, but unshift (and no callback).

    b8r.unshiftByPath('model', 'data.path, item);
    b8r.unshiftByPath('model.data.path, item);

Insert an item into the specified array property. (Automatically updates bound lists).

    b8r.removeListInstance(element);

Removes a data-list-instance's corresponding list member and any other bound data-list-instances.
*/

Object.assign(b8r, require('./b8r.iterators.js'));

b8r.register = function (name, obj) {
  if (name.match(/^_[^_]*_$/)) {
    throw "cannot register object as " + name + ", all names starting and ending with a single '_' are reserved.";
  }
  models[name] = obj;
  if (b8r.getByPath(models[name], 'add')) {
    models[name].add();
  }
  b8r.touchByPath(name);
  playSavedMessages(name);
};

b8r.models = () => Object.keys(models); //.filter(key => key.indexOf(/^c#/) === -1);

b8r.componentInstances = () => Object.keys(models).filter(key => key.indexOf(/^c#/) !== -1);

b8r.isRegistered = function(name) {
  return models[name] !== undefined;
};

b8r.deregister = function (name) {
  if (name && models[name]) {
    (models[name].remove || noop)();
    delete(models[name]);
  }
  // garbage collect models
  const instances = b8r.find('[data-component-id]').map(elt => elt.getAttribute('data-component-id'));
  for (var model in models) {
    if (model.substr(0,2) === 'c#' && instances.indexOf(model) === -1) {
      (models[model].remove || noop)();
      delete(models[model]);
    }
  }
};

b8r.touchByPath = function(name, path, source_element) {
  const full_path = !path || path === '/' ? name : name + '.' + path;

  b8r.logStart('touchByPath', full_path);

  const lists = b8r.makeArray(document.querySelectorAll('[data-list*="' + full_path + '"]'));
  lists.forEach(element => {
    if(element !== source_element){
      bindList(element);
      b8r.trigger('change', element);
    }
  });
  const elements = b8r.
                      makeArray(document.querySelectorAll('[data-bind*="' + full_path + '"]')).
                      filter(notInListTemplate);
  elements.forEach(element => element !== source_element && bind(element));

  b8r.logEnd('touchByPath', full_path);
};

const logs = {};

b8r.log = (log_name, entry_name) => {
  if(!logs[log_name]) {
    logs[log_name] = {};
  }
  const log = logs[log_name];
  if (!log[entry_name]) {
    log[entry_name] = {count: 0, times: [], total_time: 0};
  }
  log[entry_name].count += 1;
  return log[entry_name];
};

b8r.logStart = (log_name, entry_name) => {
  b8r.log(log_name, entry_name).start = Date.now();
};

b8r.logEnd = (log_name, entry_name) => {
  const log = logs[log_name][entry_name];
  const elapsed = Date.now() - log.start;
  delete(log.start);
  log.times.push(elapsed);
  log.total_time += elapsed;
};

const medianOfSortedArray = values => (
  values[Math.floor(values.length / 2)] +
  values[Math.floor(values.length / 2 - 0.5)]
)/2;

b8r.showLogs = (which, threshold) => {
  if (which) {
    var mapped = b8r.mapEachKey(logs[which], val => {
      const {count, times, total_time} = val;
      var best, worst, median;
      if (times.length) {
        const sorted = times.sort();
        best = sorted[0];
        worst = sorted[sorted.length - 1];
        median = medianOfSortedArray(sorted);
      } else {
        best = worst = median = '';
      }
      return {count, best, median, worst, total_time};
    });
    if(threshold) {
      mapped = b8r.filterObject(mapped, entry => entry.total_time > threshold);
    }
    console.table(mapped, ['count', 'best', 'median', 'worst', 'total_time']);
  } else {
    console.table(logs, []);
  }
};

b8r.setByPath = function (...args) {
  var name, path, value, source_element;
  if (args.length === 2 && typeof args[1] === 'object') {
    [name, value] = args;
    b8r.forEachKey(value, (val, path) => b8r.setByPath(name, path, val));
    return;
  } else if (args.length === 2 || args[2] instanceof HTMLElement) {
    [path, value, source_element] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, source_element] = args;
  }
  if (models[name]) {
    const model = models[name];
    if(typeof path === 'object'){
      Object.assign(model, path);
      b8r.touchByPath(name, '/', source_element);
    } else {
      setByPath(model, path, value);
      b8r.touchByPath(name, path, source_element);
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`);
  }
};

b8r.pushByPath = function(...args) {
  var name, path, value, callback;
  if(args.length === 2 || typeof args[2] === 'function') {
    [path, value, callback] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value, callback] = args;
  }
  if (models[name]) {
    const list = getByPath(models[name], path);
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
  var name, path, value;
  if (args.length === 2) {
    [path, value] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, value] = args;
  }
  if (models[name]) {
    const list = getByPath(models[name], path);
    list.unshift(value);
    b8r.touchByPath(name, path);
  } else {
    console.error(`unshiftByPath failed; ${name} is not a registered model`);
  }
};

const notInListTemplate = elt => !elt.closest('[data-list]');

b8r.removeListInstance = function(elt) {
  elt = elt.closest('[data-list-instance]');
  if (elt) {
    const ref = elt.getAttribute('data-list-instance');
    try {
      const [,model,path,key] = ref.match(/^([^.]+)\.(.+)\[([^\]]+)\]$/);
      b8r.removeByPath(model, path, key);
    } catch(e) {
      console.error('cannot find list item for instance', ref);
    }
  } else {
    console.error('cannot remove list instance for', elt);
  }
};

function indexFromKey (list, key) {
  if (typeof key === 'number') {
    return key;
  }
  const [id_path, value] = key.split('=');
  return list.findIndex(elt => getByPath(elt, id_path) == value);
}

b8r.removeByPath = function(...args) {
  var name, path, key;
  if (args.length === 2) {
    [path, key] = args;
    [name, path] = pathSplit(path);
  } else {
    [name, path, key] = args;
  }
  if (models[name]) {
    const list = getByPath(models[name], path);
    const index = indexFromKey(list, key);
    if (Array.isArray(list) && index > -1) {
      list.splice(index, 1);
    } else {
      delete list[key];
    }
    b8r.touchByPath(name, path);
  }
};

b8r.getByPath = function (model, path) {
  return getByPath(models, path ? model + '.' + path : model);
};

b8r.listItems = element => b8r.makeArray(element.children)
                              .filter(elt => elt.matches('[data-list-instance]'));
b8r.listIndex = element => b8r.listItems(element.parentElement).indexOf(element);

/**
### Finding Bound Data

To quickly obtain bound data a component from an element inside it:

    b8r.getComponentData(elt)

To quickly obtain bound data a list instance from an element inside it:

    b8r.getListInstance(elt)
*/

b8r.getComponentId = function(elt) {
  const component = elt.closest('[data-component-id]');
  return component ? component.getAttribute('data-component-id') : null;
};

b8r.getComponentData = function(elt) {
  const id = b8r.getComponentId(elt);
  return id ? b8r.getByPath(id) : null;
};

b8r.getListInstancePath = function(elt) {
  const component = elt.closest('[data-list-instance]');
  return component ? component.getAttribute('data-list-instance') : null;
};

b8r.getListInstance = function(elt) {
  const instancePath = b8r.getListInstancePath(elt);
  return instancePath ? b8r.getByPath(instancePath) : null;
};

/**
You can programmatically add a data binding using:

    b8r.addDataBinding(element, toTarget, path);

And remove a data binding using:

    b8r.removeDataBinding(element, toTarget, path);
*/

b8r.addDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  const existing = (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if(existing.indexOf(binding) === -1) {
    existing.push(binding);
    element.setAttribute('data-bind', existing.join(';'));
  }
};

b8r.removeDataBinding = (element, toTarget, path) => {
  const binding = `${toTarget}=${path}`;
  var existing = (element.getAttribute('data-bind') || '').split(';').map(s => s.trim());
  if(existing.indexOf(binding) > -1) {
    existing = existing.filter(exists => exists !== binding);
    if (existing.length) {
      element.setAttribute('data-bind', existing.join(';'));
    } else {
      element.removeAttribute('data-bind');
    }
  }
};

const {getEventHandlers, getParsedEventHandlers, on, off, enable, disable, implicit_event_types} = require('./b8r.events.js');
b8r.on = on;
b8r.off = off;
b8r.enable = enable;
b8r.disable = disable;

/**
### Special event handling

    b8r.onAny(event_type, object, method) => handlerRef

creates an event handler that will get first access to any event; returns a reference for purposes of removal

    b8r.offAny(handlerRef,...)

removes all the handlerRefs passed

    b8r.anyListeners()

returns active any listeners.

**Note** that this works *exactly* like an invisible element in front of everything else
for purposes of propagation.

*/
const anyArgs = args => {
  var event_type, object, method, path;
  if (args.length === 2) {
    [event_type, path] = args;
  } else {
    [event_type, object, method] = args;
    path = object + '.' + method;
  }
  return {event_type, path};
};

var anyElement = null;
b8r.onAny = function(...args) {
  const {event_type, path} = anyArgs(args);
  if (!anyElement) {
    anyElement = b8r.create('div');
  }
  b8r.on(anyElement, event_type, path);
};

b8r.offAny = function (...args) {
  const {event_type, path} = anyArgs(args);
  if (anyElement) {
    b8r.off(anyElement, event_type, path);
    if (!anyElement.getAttribute('data-event')) {
      anyElement = null;
    }
  }
};

b8r.anyListeners = () => getEventHandlers(anyElement);

/**
    b8r.callMethod(method_path, ...args)
    b8r.callMethod(model, method, ...args);

Call a method by name from a registered method. If the relevant model has not yet been registered
(e.g. it's being loaded asynchronously) it will get the message when it's registered.
*/

var saved_messages = []; // {model, method, evt}

function saveMethodCall(model, method, args) {
  saved_messages.push({model, method, args});
}

function playSavedMessages(for_model) {
  var playbackQueue = [];
  for (var i = saved_messages.length - 1; i >= 0; i--) {
    if (saved_messages[i].model === for_model) {
      playbackQueue.push(saved_messages[i]);
      saved_messages.splice(i,1);
    }
  }
  while (playbackQueue.length) {
    var {model, method, args} = playbackQueue.pop();
    b8r.callMethod(model, method, ...args);
  }
}

b8r.getComponentWithMethod = function(element, path) {
  var component_id = false;
  element = element.closest('[data-component-id]');
  while (element instanceof HTMLElement) {
    if(b8r.getByPath(element.getAttribute('data-component-id'), path) instanceof Function) {
      component_id = element.getAttribute('data-component-id');
      break;
    }
    element = element.parentElement.closest('[data-component-id]');
  }
  return component_id;
};

b8r.callMethod = function (...args) {
  var model, method;
  try {
    if (args[0].match(/[\[.]/)) {
      [method, ...args] = args;
      [model, method] = pathSplit(method);
    } else {
      [model, method, ...args] = args;
    }
  } catch(e) {
    debugger; // jshint ignore:line
  }
  var result = null;
  if ( models[model] ) {
    if (models[model][method] instanceof Function) {
      result = models[model][method](...args);
    } else {
      console.error(`callMethod failed: ${model}.${method} is not a function`);
    }
  } else {
    // TODO queue if model not available
    // event is stopped from further propagation
    // provide global wrappers that can e.g. put up a spinner then call the method
    saveMethodCall(model, method, args);
  }
  return result;
};

/**
## Keystrokes

b8r leverages the modern browser's event "code" to identify keystrokes,
and uses a normalized representation of modifier keys (in alphabetical)
order.

  * **alt** represents the alt or option keys
  * **ctrl** represents the control key
  * **meta** represents the windows, command, or meta keys
  * **shift** represents the shift keys

To get a normalized representation of a keystroke, there's:

    b8r.keystroke(event)

```
<label>
  Type in here
  <input style="width: 60px;" data-event="keydown:_component_.key">
</label>

<div data-bind="text=_component_.keystroke"></div>
<script>
  const key = evt => {
    set('keystroke', b8r.keystroke(evt));
    return true; // process keystroke normally
  };
  set ({key})
</script>
```
*/
b8r.keystroke = function(evt) {
  var code = [];
  if(evt.altKey){ code.push('alt'); }
  if(evt.ctrlKey){ code.push('ctrl'); }
  if(evt.metaKey){ code.push('meta'); }
  if(evt.shiftKey){ code.push('shift'); }
  if(evt.code) {
    code.push(evt.code.replace(/Key|Digit/, ''));
  } else {
    var synthetic_code = evt.keyIdentifier;
    if (synthetic_code.substr(0,2) === 'U+') {
      synthetic_code = String.fromCharCode(parseInt(evt.keyIdentifier.substr(2), 16));
    }
    code.push(synthetic_code);
  }
  return code.join('-');
};

function handleEvent (evt) {
  var target = anyElement ? anyElement : evt.target;
  var keystroke = evt instanceof KeyboardEvent ? b8r.keystroke(evt) : {};
  var done = false;
  while (target && !done) {
    var handlers = getParsedEventHandlers(target);
    var result = false;
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      for (var type_index = 0; type_index < handler.types.length; type_index++) {
        if(
          handler.types[type_index] === evt.type &&
            (!handler.type_args[type_index] || handler.type_args[type_index].indexOf(keystroke) > -1)
        ) {
          if( handler.model && handler.method ) {
            if(handler.model === '_component_') {
              handler.model = b8r.getComponentWithMethod(target, handler.method);
            }
            result = b8r.callMethod(handler.model, handler.method, evt, target);
          } else {
            console.error('incomplete event handler on', target);
            break;
          }
          if (result !== true) {
            evt.stopPropagation();
            evt.preventDefault();
            done = true;
            break;
          }
        }
      }
    }
    target = target === anyElement ? evt.target : target.parentElement;
  }
}

/**
    trigger(type, target);

Trigger a synthetic implicit (only!) event. Note that you can trigger and handle
completely made-up events, but if you trigger events that occur naturally the goal
is for them to be handled exactly as if they were "real".

*/
b8r.trigger = (type, target) => {
  if (typeof type !== 'string' || !(target.dispatchEvent instanceof Function)) {
    console.error ('expected trigger(event_type, target_element)', type, target);
  }
  if (target) {
    const event = new Event(type);
    target.dispatchEvent(event);
    if(target instanceof HTMLElement && implicit_event_types.indexOf(type) === -1) {
      handleEvent(event);
    }
  } else {
    console.warn('b8r.trigger called with no specified target');
  }
};

if (window.TouchEvent) {
  ['touchstart', 'touchcancel', 'touchmove', 'touchend'].forEach(type => implicit_event_types.push(type));
}

implicit_event_types.forEach(type => document.body.addEventListener(type, handleEvent, true));

/*
  This is where we define all the methods for binding to/from the DOM
*/

/**
## Data Binding

Data binding is implemented via the data-bind and data-list attributes.
*/

const toTargets = require('./b8r.toTargets.js')(b8r);
const fromTargets = require('./b8r.fromTargets.js')(b8r);

function parseBinding (binding) {
  if(!binding.trim()) {
    throw 'empty binding';
  }
  if(binding.indexOf('=') === -1) {
    throw 'binding is missing = sign; probably need a source or target';
  }
  var [,targets, path] = binding.trim().match(/^([^=]*)=(.*)$/m).map(s => s.trim());
  targets = targets.split(',').map(function(target){
    var parts = target.match(/(\w+)(\(([^)]+)\))?/);
    if(!parts) {
      console.error('bad target', target, 'in binding', binding);
      return;
    }
    return parts ? { target: parts[1], key: parts[3] } : null;
  });
  if (!path) {
    console.error('binding does not specify source', binding);
  }
  return {targets, path};
}

function pathSplit(full_path) {
  const [,model,,path] = full_path.match(/^(.*?)(\.(.*))?$/);
  return [model, path];
}

function getBindings (element) {
  var binding_source = element.getAttribute('data-bind');
  if(!element.matches('[data-list]') && binding_source.indexOf('=.') > -1) {
    const instance_path = b8r.getListInstancePath(element);
    if(instance_path) {
      binding_source = binding_source.replace(/\=\./g, `=${instance_path}.`);
      element.setAttribute('data-bind', binding_source);
    }
  }
  return binding_source.split(';').filter(s => !!s.trim()).map(parseBinding);
}

function findBindables (element) {
  return b8r.
    findWithin(element, '[data-bind]', true).
    filter(elt => {
      var list = elt.closest('[data-list],[data-list-instance]');
      return !list || list === element || !element.contains(list);
    });
}

b8r.onAny(['change', 'input'], '_b8r_', 'update', true);
function bind (element) {
  var bindings = getBindings(element);
  for (var i = 0; i < bindings.length; i++) {
    var {targets, path} = bindings[i];
    const value = b8r.getByPath(path);
    var _toTargets = targets.filter(t => toTargets[t.target]);
    if (_toTargets.length) {
      _toTargets.forEach(t => {
        toTargets[t.target](element, value, t.key);
      });
    } else {
      // TODO save message for when source is registered
    }
  }
}

function findLists (element) {
  return b8r.findWithin(element, '[data-list]')
        .filter(elt => {
          var list = elt.parentElement.closest('[data-list]');
          return !list || list === element || !element.contains(list);
        });
}

const {show, hide} = require('./b8r.show.js');
b8r.show = show;
b8r.hide = hide;

function removeListInstances(element) {
  while(
    element.previousSibling &&
    (
      !element.previousSibling.matches ||
      element.previousSibling.matches('[data-list-instance]')
    )
  ) {
    element.parentElement.removeChild(element.previousSibling);
  }
}

b8r.listInstances = list_template => {
  const instances = [];
  var instance = list_template.previousSibling;
  while(instance && instance instanceof HTMLElement && instance.matches('[data-list-instance]')) {
    instances.push(instance);
    instance = instance.previousSibling;
  }
  return instances.reverse();
};

function bindList (list_template, data) {
  const [source_path, id_path] = list_template.getAttribute('data-list').split(':');
  var method_path, list_path;
  try {
    // parse computed list method if any
    [,, method_path, list_path] = source_path.match(/^(([^()]*)\()?([^()]*)(\))?$/);
  } catch(e) {
    console.error('bindList failed; bad source path', source_path);
  }
  b8r.logStart('bindList', list_path);
  const [model, path] = pathSplit(list_path);
  if (model === '' && !data) {
    return;
  }
  var list = data ? getByPath(data, path) : b8r.getByPath(model, path);
  if (!list) {
    return;
  }
  // compute list
  if (method_path) {
    (function(){
      try {
        const [,method,path] = method_path.match(/^(.*?)\.(.*)$/);
        list = b8r.callMethod(method, path, list);
      } catch(e) {
        console.error('bindList failed; bad method path', method_path, e);
      }
    }());
    if(!list) {
      throw 'could not compute list; async computed list methods not supported (yet)';
    }
  }
  b8r.show(list_template);
  if(!id_path) {
    removeListInstances(list_template);
  }
  // efficient list update:
  // if we have an id_path we grab existing instances, and re-use those with matching ids
  const existing_list_instances = id_path ? b8r.listInstances(list_template) : [];

  var previous_instance = list_template;
  for (var i = list.length - 1; i >= 0; i--) {
    var instance_idx, instance;
    const id = id_path ? id_path + '=' + getByPath(list[i], id_path): i;
    const itemPath = list_path + '[' + id + ']';
    instance_idx = existing_list_instances.
                   findIndex(elt => elt.getAttribute('data-list-instance') === itemPath);
    if(instance_idx === -1) {
      instance = list_template.cloneNode(true);
      instance.removeAttribute('data-list');
      instance.setAttribute('data-list-instance', itemPath);
      bindAll(instance, itemPath);
      list_template.parentElement.insertBefore(instance, previous_instance);
    } else {
      instance = existing_list_instances[instance_idx];
      existing_list_instances.splice(instance_idx, 1);
      bindAll(instance);
      if(instance.nextSibling !== previous_instance) {
        list_template.parentElement.insertBefore(instance, previous_instance);
      }
    }
    previous_instance = instance;
  }
  // anything still there is no longer in the list and can be removed
  if (id_path) {
    existing_list_instances.forEach(instance => instance.remove());
  }
  b8r.hide(list_template);
  b8r.logEnd('bindList', list_path);
}

function bindAll(element, data) {
  const random_entry = b8r.getComponentId(element) + '-' + Math.random();
  b8r.logStart('bindAll', random_entry);
  loadAvailableComponents(element, data);
  findBindables(element).forEach(elt => bind(elt));
  findLists(element).forEach(elt => bindList(elt, data));
  if(element.parentElement) {
    b8r.trigger('change', element.parentElement);
  }
  b8r.logEnd('bindAll', random_entry);
}

b8r.bindAll = bindAll;

models._b8r_ = {
  echo: evt => console.log(evt) || true,
  stopEvent: () => {},
  update: evt => {
    var elements = b8r.findAbove(evt.target, '[data-bind]', null, true);
    if (evt.target.tagName === 'SELECT') {
      const options = b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])');
      elements = elements.concat(options);
    }
    elements.
      filter(elt => !elt.matches('[data-list]')).
      forEach(elt => {
        var bindings = getBindings(elt);
        for (var i = 0; i < bindings.length; i++) {
          var {targets, path} = bindings[i];
          targets = targets.filter(t => fromTargets[t.target]);
          targets.forEach(t => {
            b8r.setByPath(path, fromTargets[t.target](elt, t.key), elt);
          });
        }
      });
    return true;
  },
};

const ajax = require('./b8r.ajax.js');
Object.assign(b8r, ajax);

const components = {};
const component_timeouts = {};

/**
    b8r.component(name, url);

Loads component from url registers it as "name". (Components are registered separately from other objects.)
Returns a promise of the component once loaded.

    b8r.component('path/to/name');

If just a url parameter is provided, the name of the component will be inferred.

**Note**: the extension .component.html is appended to url

Instances of the component will automatically be inserted as expected once loaded.

**Also note**: you can usually avoid the pattern:

    b8r.component(...).then(c => b8r.insertComponent(c, target))

By simply binding the component to the target and letting nature take its course.
*/
const component_promises = {};
b8r.component = function (name, url) {
  if (url === undefined) {
    url = name;
    name = url.split('/').pop();
  }
  if(!component_promises[name]) {
    component_promises[name] = new Promise(function(resolve, reject) {
      if (components[name]) {
        resolve(components[name]);
      } else {
        b8r.ajax((url || name) + '.component.html').then(source => {
          resolve(b8r.makeComponent(name, source));
        }, err => {
          delete component_promises[name];
          reject(err);
        });
      }
    });
  }
  return component_promises[name];
};

b8r.makeStylesheet = function(source) {
  const style = source ? b8r.create('style') : false;
  if (style) {
    style.type = 'text/css';
    style.appendChild(b8r.text(source));
    document.head.appendChild(style);
  }
  return style;
};

b8r.makeComponent = function(name, source) {
  var css = false, content, script = false, parts, remains;

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/);
  if (parts.length === 3) {
    [,css,remains] = parts;
  } else {
    remains = source;
  }

  // content <script> script </script> nothing
  parts = remains.split(/<script>|<\/script>/);
  if (parts.length === 3) {
    [content, script] = parts;
  } else {
    content = remains;
  }

  var div = b8r.create('div');
  div.innerHTML = content;
/*jshint evil: true */
  var load = script ? new Function(
    'component',
    'b8r',
    'find',
    'findOne',
    'data',
    'register',
    'get',
    'set',
    'on',
    'touch',
    `${script}\n//# sourceURL=${name}(component)`
  ) : false;
/*jshint evil: false */
  const style = b8r.makeStylesheet(`/* ${name} component */\n` + css);
  var component = {name: name, style, view: div, load: load, _source: source};
  if (component_timeouts[name]) {
    clearInterval(component_timeouts[name]);
  }
  if (components[name]) {
    // don't want to leak stylesheets
    if (components[name].style) {
      components[name].style.remove();
    }
    console.warn('component %s has been redefined', name);
  }
  components[name] = component;
  b8r.
    find('[data-component="' + name + '"]').
    filter(notInListTemplate).
    forEach(element => b8r.insertComponent(component, element));
  return component;
};

var data_waiting_for_components = []; // { target_element, data }

function saveDataForElement(target_element, data) {
  if (data) {
    removeDataForElement(target_element);
    data_waiting_for_components.push({target_element, data});
  }
}

function dataForElement(target_element) {
  var data;
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      data = data_waiting_for_components[i].data;
      removeDataForElement(target_element);
      return data;
    }
  }

  const json = target_element.getAttribute('data-json');
  if (json) {
    return JSON.parse(json);
  }

  return b8r.getComponentData(target_element) || b8r.getListInstance(target_element) || {};
}

function removeDataForElement(target_element) {
  for (var i = 0; i < data_waiting_for_components.length; i++) {
    if (data_waiting_for_components[i].target_element === target_element) {
      delete data_waiting_for_components[i].data;
    }
  }
}

function loadAvailableComponents(element, data) {
  b8r.findWithin(element || document.body, '[data-component]').forEach(target => {
    if (!target.closest('[data-list]') && !target.matches('[data-component-id]')) {
      var name = target.getAttribute('data-component');
      b8r.insertComponent(name, target, data);
    }
  });
}

/**
    b8r.insertComponent(component, element, data);

insert a component by name or by passing a component record (e.g. promised by component() or produced by makeComponent)

If no element is provided, the component will be appended to document.body

Data will be passed to the component's load method and registered as the component's private instance data. (Usually
data is passed automatically from parent components or via binding, e.g. `data-bind="component=path.to.data` binds that
data to the component).
*/

function replaceInBindings(element, needle, replacement) {
  const needle_regexp = new RegExp(needle, 'g');
  b8r.findWithin(element, `[data-bind*="${needle}"],[data-list*="${needle}"]`).forEach(elt => {
    ['data-bind', 'data-list'].forEach(attr => {
      const val = elt.getAttribute(attr);
      if(val) {
        elt.setAttribute(attr, val.replace(needle_regexp, replacement));
      }
    });
  });
}

function getDataPath(data, element) {
  if (typeof data === 'string') {
    return data;
  }
  const data_parent = element ? element.closest('[data-path],[data-list-instance]') : false;
  return data_parent ? data_parent.getAttribute('data-path') || data_parent.getAttribute('data-list-instance') : false;
}

var component_count = 0;
b8r.insertComponent = function (component, element, data) {
  const data_path = getDataPath(data, element);
  if (!element) {
    element = b8r.create('div');
  }
  if (element.getAttribute('data-component') !== component.name || component) {
    element.setAttribute('data-component', component.name || component);
  }
  if (typeof component === 'string') {
    if(!components[component]) {
      if (!component_timeouts[component]) {
        // if this doesn't happen for five seconds, we have a problem
        component_timeouts[component] = setTimeout(() => console.error('component timed out: ', component), 5000);
      }
      if (data) {
        saveDataForElement(element, data);
      }
      return;
    }
    component = components[component];
  }
  if (!data || data_path) {
    data = dataForElement(element, component.name);
  }
  if (element.parentElement === null) {
    document.body.appendChild(element);
  }
  var children = b8r.fragment();
  const component_id = 'c#' + component.name + '#' + (++component_count);
  if (component.view.children.length) {
    b8r.moveChildren(element, children);
    b8r.copyChildren(component.view, element);
    replaceInBindings(element, '_component_', component_id);
    if (data_path) {
      replaceInBindings(element, '_data_', data_path);
    }
    var children_dest = b8r.findOneWithin(element, '[data-children]');
    if (children.firstChild && children_dest) {
      b8r.empty(children_dest);
      b8r.moveChildren(children, children_dest);
    }
  }
  element.setAttribute('data-component-id', component_id);
  if(data_path) {
    element.setAttribute('data-path', data_path);
  }
  const register = component_data => b8r.register(component_id, component_data);
  data = Object.assign({}, data);
  Object.assign(data, {data_path, component_id});
  if (component.load) {
    const get = path => b8r.getByPath(component_id, path);
    const set = (...args) => {
      b8r.setByPath(component_id, ...args);
      b8r.trigger('change', element);
    };
    const on = (...args) => {
      args[1] = args[1].replace(/_component_/, component_id);
      b8r.on(element, ...args);
    };
    const touch = (path) => b8r.touchByPath(component_id, path);
    register(data);
    const view_obj = component.load(
      element,
      b8r,
      selector => b8r.findWithin(element, selector),
      selector => b8r.findOneWithin(element, selector),
      data,
      register,
      get,
      set,
      on,
      touch
    );
    if (view_obj) {
      console.warn('returning from views is deprecated; please use register() instead');
      b8r.register(component_id, view_obj);
    }
  } else {
    register(data);
  }
  bindAll(element);
  return element;
};

}(module));
