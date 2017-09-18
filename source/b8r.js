/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of markup,
style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.
*/
/* jshint esnext:true, loopfunc:true, latedef:false */
/* globals console, require, module */

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
  play_saved_messages,
} = require('./b8r.events.js');
Object.assign(b8r, { on, off, enable, disable, callMethod, trigger });
const {
  addDataBinding,
  removeDataBinding,
  getDataPath,
  getListInstancePath,
  getComponentDataPath,
  findLists,
  findBindables,
  getBindings,
  replaceInBindings
} = require('./b8r.bindings.js');
Object.assign(b8r, {addDataBinding, removeDataBinding, getDataPath, getListInstancePath});
const { saveDataForElement, dataForElement } =
  require('./b8r.dataForElement.js');
const {onAny, offAny, anyListeners} =
    require('./b8r.anyEvent.js');
Object.assign(b8r, { onAny, offAny, anyListeners });
Object.assign(b8r, require('./b8r.registry.js'));
b8r.observe(
    () => true,
            (path, source_element) => b8r.touchByPath(path, source_element));
const { keystroke, modifierKeys } = require('./b8r.keystroke.js');
b8r.keystroke = keystroke;
b8r.modifierKeys = modifierKeys;

/**
    b8r.register(name, obj);

registers an object by name as data or controller. The names `_component_`,
`_data_` and `_b8r_` are reserved; other similar names may be reserved later.

`_b8r_` is the name of the collection of internal event handlers for bound variables.

    b8r.deregister(name); // removes a registered object
    b8r.deregister(); // just cleans up obsolete component data

Remove a registered (named) object. deregister also removes component instance objects
for components no longer in the DOM.

    b8r.setByPath('model', 'data.path, value);
    b8r.setByPath('model.data.path', value);

Set a registered object's property by path; bound elements will be updated automatically.

    b8r.getByPath('model', 'data.path');
    b8r.getByPath('model.data.path');

Get a registered object's property by path.

    b8r.pushByPath('model', 'data.path', item, callback);
    b8r.pushByPath('model.data.path', item, callback);

As above, but unshift (and no callback).

    b8r.unshiftByPath('model', 'data.path', item);
    b8r.unshiftByPath('model.data.path', item);

Insert an item into the specified array property. (Automatically updates bound
lists).


> ### Note
>
> Having gained experience with the framework, I am doubling down
> on object paths and simplifying the API in favor of:
> <pre>
> b8r.get('path.to.value');
> b8r.set('path.to.value', new_value);
> </pre>
> The older APIs (setByPath, etc.) will ultimately be deprecated. Even now they
> are little more than wrappers for set/get. See the *Registry* docs.

Also note that the new registry APIs provide an explicit *observable*.

    b8r.removeListInstance(element);

Removes a data-list-instance's corresponding list member and any other bound
data-list-instances.
*/

b8r.register = function(name, obj) {
  if (name.match(/^_[^_]*_$/)) {
    throw 'cannot register object as ' + name +
      ', all names starting and ending with a single \'_\' are reserved.';
  }
  b8r.set(name, obj);
  play_saved_messages(name);
};

b8r.componentInstances = () =>
  b8r.models().filter(key => key.indexOf(/^c#/) !== -1);

/**
    b8r.debounce(method, min_interval_ms) => debounced method
    b8r.throttle(method, min_interval_ms) => throttled method

Two utility functios for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

The key difference is that **debounce** is guaranteed to actually call the
original method after the debounced wrapper stops being called for the
minimum interval.

Meanwhile **throttle** will refuse to call the original method again
if it was previously called within the specified interval.
*/

b8r.debounce = (orig_fn, min_interval) => {
  var debounce_id;
  return (...args) => {
    if (debounce_id) {
      clearTimeout(debounce_id);
    }
    debounce_id = setTimeout(() => orig_fn(...args), min_interval);
  };
};

b8r.throttle = (orig_fn, min_interval) => {
  var last_call = Date.now() - min_interval;
  return (...args) => {
    const now = Date.now();
    if (now - last_call > min_interval) {
      last_call = now;
      orig_fn(args);
    }
  };
};

b8r.cleanupComponentInstances = b8r.debounce(() => {
  // garbage collect models
  const instances = b8r.find('[data-component-id]')
                      .map(elt => elt.getAttribute('data-component-id'));
  b8r.models().forEach((model) => {
    if (model.substr(0, 2) === 'c#' && instances.indexOf(model) === -1) {
      b8r.remove(model);
    }
  });
}, 2000);

b8r.deregister = name => b8r.remove(name);

const notInListTemplate = elt => !elt.closest('[data-list]');

/**
> ### Experiment: Async Updates
>
> With the goal of keeping all updates smooth and seamless, the idea here is to
> make automatically generated DOM updates asynchronous (via requestAnimationFrame)
> This has the advantage of deduplicating updates (i.e. not updating a given element)
> more than once owing to underlying data changes) and also allowing updates to be
> broken up into time-budgeted chunks (e.g. 1/30 or 1/60 of a second)
>
> Initial experiments seem to cause no breakage *except* for unit tests, but simply
> updating the unit tests and then turning them on by default seems a bit risky, so instead
> for the time being we get the following usage:
>
> <pre>
> b8r.async_updates(); // returns true | false
> b8r.async_updates(true); // enable async updates
> b8r.async_updates(false); // disable async updates
> b8r.after_update(callback); // fires callback after async updates are complete
> </pre>
>
> So, if you had code that looked like this:
>
> <pre>
> b8r.register('foo', {bar: 17});
> console.log(b8r.findOne('[data-bind="text=foo.bar"]').value); // logs 17
> </pre>
>
> You could now have to write this:
>
> <pre>
> b8r.async_updates(true);
> b8r.register('foo', {bar: 17});
> b8r.after_update(() => {
>   console.log(b8r.findOne('[data-bind="text=foo.bar"]').value);
> });
> </pre>
>
> Note that async_updates is a **global** setting, so you could easily break other
> stuff by doing this. The end goal is to use async_updates everywhere.
*/

let _async_updates = true;

const _update_list = [];

const _after_update_callbacks = [];

const _update = () => {
  b8r.logStart('async_update', 'update');

  while(_update_list.length) {
    const {fn, element} = _update_list.shift();
    fn(element);
  }
  while(_after_update_callbacks.length) {
    (_after_update_callbacks.shift())();
  }

  b8r.logEnd('async_update', 'update');
};

const _change_list = [];

const _trigger_changes = () => {
  b8r.logStart('async_update', 'changes');
  _change_list.forEach(element => b8r.trigger('change', element));
  _change_list.splice(0);
  b8r.logEnd('async_update', 'changes');
};

const _trigger_change = element => {
  if (element instanceof HTMLElement) {
    if (!_change_list.length) {
      requestAnimationFrame(_trigger_changes);
    }
    if (_change_list.indexOf(element) === -1) {
      _change_list.push(element);
    }
  }
};

const async_update = (fn, element) => {
  if (!_async_updates) {
    fn(element);
  } else if (!_update_list.find(item => item.fn === fn && item.element === element)) {
    b8r.logStart('async_update', 'queue');
    _update_list.push({ fn, element });
    requestAnimationFrame(_update);
    b8r.logEnd('async_update', 'queue');
  }
};

b8r.async_updates = setting => {
  if (setting === undefined) {
    return _async_updates;
  } else {
    _async_updates = !!setting;
  }
};

b8r.after_update = callback => {
  if (_update_list.length) {
    if (_after_update_callbacks.indexOf(callback) === -1) {
      _after_update_callbacks.push(callback);
    }
  } else {
    callback();
  }
};

b8r.touchByPath = (...args) => {
  let full_path, source_element, name, path;

  if (args[1] instanceof HTMLElement) {
    [full_path, source_element] = args;
  } else {
    [name, path, source_element] = args;
    full_path = !path || path === '/' ? name : name + (path[0] !== '[' ? '.' : '') + path;
  }

  b8r.logStart('touchByPath', full_path);

  const lists = b8r.makeArray(document.querySelectorAll('[data-list*="' + full_path + '"]'));
  lists.forEach(element => {
    if (element !== source_element) {
      async_update(bindList, element);
    }
  });

  b8r.makeArray(document.querySelectorAll('[data-bind*="' + full_path + '"]'))
    .filter(notInListTemplate)
    .filter(element => element !== source_element)
    .forEach(element => async_update(bind, element));

  b8r.logEnd('touchByPath', full_path);
};

b8r.setByPath = function(...args) {
  var name, path, value, source_element;
  if (args.length === 2 && typeof args[1] === 'object') {
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
      b8r.set(path[0] === '[' || !path ? `${name}${path}` : `${name}.${path}`, value, source_element);
    }
  } else {
    console.error(`setByPath failed; ${name} is not a registered model`);
  }
};

b8r.pushByPath = function(...args) {
  var name, path, value, callback;
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
  var name, path, value;
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
    const ref = elt.getAttribute('data-list-instance');
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
  var name, path, key;
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

/**
### Finding Bound Data

To get a component's id (which you should not need to do very often)
you can call getComponentId:

    b8r.getComponentId(elt)

The component id looks like c# _component name_ # _n_ where _n_ is the
simply the creation order. It follows that component ids are guaranteed
to be unique.

To quickly obtain bound data a component from an element inside it:

    b8r.getComponentData(elt)

In effect this simply gets the component id and then finds the corresponding
registered data object (or "model").

To quickly obtain bound data a list instance from an element inside it:

    b8r.getListInstance(elt)
*/

b8r.getComponentId = getComponentDataPath;

b8r.getComponentData = elt => {
  const id = getComponentDataPath(elt);
  return id ? b8r.get(id) : null;
};

b8r.getListInstance = function(elt) {
  const instancePath = b8r.getListInstancePath(elt);
  return instancePath ? b8r.get(instancePath, elt) : null;
};

implicit_event_types.forEach(
  type => document.body.addEventListener(type, handle_event, true));

/**
    b8r.implicityHandleEventsOfType(type_string)

Adds implicit event handling for a new event type. E.g. you might want
to use `data-event` bindings for the seeking `media` event, which you
could do with `b8r.implicityHandleEventsOfType('seeking')`.
*/

b8r.implicitlyHandleEventsOfType = type => {
  if (implicit_event_types.indexOf(type) === -1) {
    implicit_event_types.push(type);
    document.body.addEventListener(type, handle_event, true);
  }
};

/**
## Data Binding

Data binding is implemented via the data-bind and data-list attributes.

See the docs on binding data to and from the DOM for more detail.

The key public methods are:

    b8r.bindAll(target); // binds all elements within target; loads available components

Or:

    b8r.bindAll(target, 'path.to.data'); // as above, but uses provided path for dynamic bindings

Note (FIXME): bindAll only applies its path to components and lists; it doesn't do it to
individual elements, which it probably should.

Also, there's a utility method:

    b8r.interpolate('string with ${data.to.path} and ${data.with.other.path}');
    b8r.interpolate('string with ${data.to.path} and ${data.with.other.path}', element);

The second argument is required if any path used is relative (e.g. `.foo.bar`),
data-relative (e.g. `_data_.foo.bar`), or component-relative (e.g. `_component_.foo.bar`).

In essence, if you want to use string interpolation, bindinator uses the ES6-style
interpolations for data paths (javascript is not supported, just data paths). Data
paths are evaluated normally, so _data_, _component_, and relative paths should
work exactly as expected.
*/

const toTargets = require('./b8r.toTargets.js')(b8r);
const fromTargets = require('./b8r.fromTargets.js')(b8r);

b8r.onAny([ 'change', 'input' ], '_b8r_', '_update_', true);

b8r.interpolate = (template, elt) => {
  let formatted;
  if (template.match(/\$\{.*?\}/)) {
    formatted = template.replace(/\$\{(.*?)\}/g, (_, path) => b8r.get(path, elt) || '') ;
  } else {
    formatted = b8r.get(template, elt);
  }
  return formatted;
};

function bind(element) {
  var bindings = getBindings(element);
  const logArgs = [ 'bind', b8r.elementSignature(element) ];
  b8r.logStart(...logArgs);
  const boundValues = element._b8rBoundValues || (element._b8rBoundValues = {});
  const newValues = {};
  let changed = false;
  for (var i = 0; i < bindings.length; i++) {
    var { targets, path } = bindings[i];
    const value = b8r.interpolate(path, element);
    if (typeof boundValues[path] === 'object' || boundValues[path] !== value) {
      changed = true;
      const signature = b8r.elementSignature(element);
      b8r.logStart('toTargets', signature);
      newValues[path] = value;
      var _toTargets = targets.filter(t => toTargets[t.target]);
      if (_toTargets.length) {
        _toTargets.forEach(t => {
          toTargets[t.target](element, value, t.key);
        });
      } else {
        console.warn(`unrecognized toTarget in binding`, element, bindings[i]);
      }
      b8r.logEnd('toTargets', signature);
    }
  }
  Object.assign(boundValues, newValues);
  b8r.logEnd(...logArgs);
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
  var instance = list_template.previousSibling;
  while (instance && instance instanceof Element &&
         instance.matches('[data-list-instance]')) {
    instances.push(instance);
    instance = instance.previousSibling;
  }
  return instances.reverse();
};

const resolveListInstanceBindings = (instance_elt, instance_path) => {
  const elements = b8r.findWithin(instance_elt, '[data-bind]', true)
                     .filter(elt => !elt.closest('[data-list]'));
  elements.forEach(elt => {
    let binding_source = elt.getAttribute('data-bind');
    if (binding_source.indexOf('=.') > -1) {
      const path_prefix = `=${instance_path}.`;
      elt.setAttribute('data-bind', binding_source.replace(/\=\./g, path_prefix));
    }
    if (binding_source.indexOf('${.') > -1) {
      elt.setAttribute('data-bind', binding_source.replace(/\$\{(\.[^\}]+)\}/g, '${' + instance_path + '$1}'));
    }
  });
};

/**
  This is an optimization that eliminates the costlier parts of bindAll
  for list elements, especially in the finest-grained case (where you're
  binding a buttload of fairly simple elements).
*/
function makeListInstanceBinder (list_template) {
  if (b8r.findWithin(list_template, '[data-list],[data-component]').length) {
    return (instance, itemPath) => {
      findBindables(instance).forEach(elt => bind(elt));
      findLists(instance).forEach(elt => bindList(elt, itemPath));
      loadAvailableComponents(instance, itemPath);
    };
  } else {
    return instance => {
      findBindables(instance).forEach(elt => bind(elt));
    };
  }
}

function bindList(list_template, data_path) {
  if (!list_template.parentElement) {
    return;
  }
  const [source_path, id_path] = list_template.getAttribute('data-list').split(':');
  var method_path, list_path;
  try {
    // parse computed list method if any
    [, , method_path, list_path] =
      source_path.match(/^(([^()]*)\()?([^()]*)(\))?$/);
  } catch (e) {
    console.error('bindList failed; bad source path', source_path);
  }
  if (data_path) {
    list_path = data_path + list_path;
  }
  b8r.logStart('bindList', b8r.elementSignature(list_template));
  var list = b8r.get(list_path, list_template);
  if (!list) {
    return;
  }
  // compute list
  if (method_path) {
    (function() {
      try {
        const filtered_list = b8r.callMethod(method_path, list, list_template);
        // debug warning
        if (filtered_list.length && list.indexOf(filtered_list[0]) === -1) {
          console.warn(`list filter ${method_path} returned a new object (not from original list); this will break updates!`);
        }
        list = filtered_list;
      } catch (e) {
        console.error(`bindList failed, ${method_path} threw error`, e);
      }
    }());
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
    existing_list_instances.forEach(elt => path_to_instance_map[elt.getAttribute('data-list-instance')] = elt);
  }

  const template = list_template.cloneNode(true);
  template.removeAttribute('data-list');
  const binder = makeListInstanceBinder(template);

  var previous_instance = list_template;
  var instance;
  for (var i = list.length - 1; i >= 0; i--) {
    const id = id_path ? id_path + '=' + getByPath(list[i], id_path) : i;
    const itemPath = `${list_path}[${id}]`;
    instance = path_to_instance_map[itemPath];
    if (instance === undefined) {
      instance = template.cloneNode(true);
      instance.setAttribute('data-list-instance', itemPath);
      resolveListInstanceBindings(instance, itemPath);
      binder(instance);
      list_template.parentElement.insertBefore(instance, previous_instance);
    } else {
      delete path_to_instance_map[itemPath];
      binder(instance);
      if (instance.nextSibling !== previous_instance) {
        list_template.parentElement.insertBefore(instance, previous_instance);
      }
    }
    previous_instance = instance;
  }
  // anything still there is no longer in the list and can be removed
  if (id_path) {
    b8r.forEachKey(path_to_instance_map, instance => instance.remove());
  }
  b8r.hide(list_template);
  _trigger_change(list_template.parentElement);
  b8r.logEnd('bindList', b8r.elementSignature(list_template));
}

b8r.bindAll = (element, data_path) => {
  const signature = b8r.elementSignature(element);
  b8r.logStart('bindAll', signature);
  loadAvailableComponents(element, data_path);
  findBindables(element).forEach(elt => bind(elt));
  findLists(element).forEach(elt => bindList(elt, data_path));
  b8r.logEnd('bindAll', signature);
  b8r.cleanupComponentInstances();
};

/**
## `_b8r_`

The _b8r_ object is registered by default as a useful set of always available
methods, especially for handling events.

You can use them the obvious way:

    <button data-event="click:_b8r_.echo">
      Click Me, I cause console spam
    </button>

    _b8r_.echo // logs events to the console
    _b8r_.stopEvent // use this to simply catch an event silently
    _b8r_._update_ // this is used by b8r to update models automatically
*/

b8r.set('_b8r_', {
  echo : evt => console.log(evt) || true,
  stopEvent : () => {},
  _update_ : evt => {
    var elements = b8r.findAbove(evt.target, '[data-bind]', null, true);
    if (evt.target.tagName === 'SELECT') {
      const options = b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])');
      elements = elements.concat(options);
    }
    elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
      var bindings = getBindings(elt);
      for (var i = 0; i < bindings.length; i++) {
        var { targets, path } = bindings[i];
        targets = targets.filter(t => fromTargets[t.target]);
        targets.forEach(t => {
          // all bets are off on bound values!
          delete elt._b8rBoundValues;
          b8r.setByPath(path, fromTargets[t.target](elt, t.key), elt);
        });
      }
    });
    return true;
  },
});

const ajax = require('./b8r.ajax.js');
Object.assign(b8r, ajax);

const components = {};
const component_timeouts = {};

/**
    b8r.component(name, url);

Loads component from url registers it as "name". (Components are registered
separately from other objects.)
Returns a promise of the component once loaded.

    b8r.component('path/to/name');

If just a url parameter is provided, the name of the component will be
inferred.

**Note**: the extension .component.html is appended to url

Instances of the component will automatically be inserted as expected once
loaded.

**Also note**: you can usually avoid the pattern:

    b8r.component(...).then(c => b8r.insertComponent(c, target))

By simply binding the component to the target and letting nature take its
course.
*/

const component_promises = {};

b8r.component = function(name, url) {
  if (url === undefined) {
    url = name;
    name = url.split('/').pop();
  }
  if (!component_promises[name]) {
    component_promises[name] = new Promise(function(resolve, reject) {
      if (components[name]) {
        resolve(components[name]);
      } else {
        b8r.ajax(`${url}.component.html`)
          .then(source => resolve(b8r.makeComponent(name, source, url)))
          .catch(err => {
            delete component_promises[name];
            console.error(err, `failed to load component ${url}`);
            reject(err);
          });
      }
    });
  }
  return component_promises[name];
};

b8r.components = () => Object.keys(components);

const makeStylesheet = require('./b8r.makeStylesheet.js');

b8r.makeComponent = function(name, source, url) {
  var css = false, content, script = false, parts, remains;

  // nothing <style> css </style> rest-of-component
  parts = source.split(/<style>|<\/style>/);
  if (parts.length === 3) {
    [, css, remains] = parts;
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
  var load = script ?
             new Function(
                'require',
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
              ) :
              false;
  /*jshint evil: false */
  const style = makeStylesheet(css, name);
  var component = {
    name,
    style,
    view : div,
    load,
    path : url.match(/^(.*?)(\/?)([^\/]+)$/)[1] || '',
  };
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

  b8r.find('[data-component="' + name + '"]').forEach(element => {
    if (!element.closest('[data-list]') &&
        !element.matches('[data-component-id]')) {
      b8r.insertComponent(component, element);
    }
  });
  return component;
};

function loadAvailableComponents(element, data_path) {
  b8r.findWithin(element || document.body, '[data-component]', true)
    .forEach(target => {
      if (!target.closest('[data-list]') &&
          !target.matches('[data-component-id]')) {
        var name = target.getAttribute('data-component');
        b8r.insertComponent(name, target, data_path);
      }
    });
}

/**
    b8r.insertComponent(component, element, data);

insert a component by name or by passing a component record (e.g. promised by
component() or produced by makeComponent)

If no element is provided, the component will be appended to document.body

Data will be passed to the component's load method and registered as the
component's private instance data. (Usually data is passed automatically
from parent components or via binding, e.g. `data-path="path.to.data` binds that
data to the component).
*/

var component_count = 0;
b8r.insertComponent = function(component, element, data) {
  const data_path = typeof data === 'string' ? data : b8r.getDataPath(element);
  if (!element) {
    element = b8r.create('div');
  }
  if (element.getAttribute('data-component') !== component.name ||
      component) {
    element.setAttribute('data-component', component.name || component);
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
      return;
    }
    component = components[component];
  }
  b8r.logStart('insertComponent', component.name);
  if (!data || data_path) {
    data = dataForElement(
        element,
        b8r.getComponentData(element) || b8r.getListInstance(element) || {});
  }
  if (element.parentElement === null) {
    document.body.appendChild(element);
  }
  var children = b8r.fragment();
  /*
    * if you're replacing a component, it should get the replaced component's children.
    * we probably want to be able to remove a component (i.e. pull out an instance's children
      and then delete element's contents, replace the children, and remove its id)
    * note that components with no DOM nodes present a problem since they may have passed-through
      child elements that aren't distinguishable from a component's original body
  */
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
  b8r.makeArray(element.classList).forEach(c => {
    if (c.substr(-10) === '-component') {
      element.classList.remove(c);
    }
  });
  element.classList.add(component.name + '-component');
  if (data_path) {
    element.setAttribute('data-path', data_path);
  }
  const register = component_data => b8r.register(component_id, component_data);
  data = Object.assign({}, data);
  Object.assign(data, { data_path, component_id });
  if (component.load) {
    const get = path => b8r.getByPath(component_id, path);
    const set = (...args) => {
      b8r.setByPath(component_id, ...args);
    };
    const on = (...args) => {
      args[1] = args[1].replace(/_component_/, component_id);
      b8r.on(element, ...args);
    };
    const touch = (path) => b8r.touchByPath(component_id, path);
    register(data);
    const view_obj = component.load(
        window.require.relative(component.path),
        element, b8r, selector => b8r.findWithin(element, selector),
        selector => b8r.findOneWithin(element, selector), data, register, get,
        set, on, touch);
    if (view_obj) {
      console.warn(
        'returning from views is deprecated; please use register() instead');
      b8r.register(component_id, view_obj);
    }
  } else {
    register(data);
  }
  if (data_path) {
    resolveListInstanceBindings(element, data_path);
  }
  b8r.bindAll(element);
  b8r.logEnd('insertComponent', component.name);
  return element;
};
