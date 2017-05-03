/**
#bindinator
Copyright ©2016-2017 Tonio Loewald

Bindinator (b8r) binds data and methods to the DOM and lets you quickly turn chunks of markup,
style, and code into reusable components so you can concentrate on your project.

b8r leverages your understanding of the DOM and the browser rather than trying to
implement some kind of virtual machine to replace it.
*/
/* jshint esnext:true, loopfunc:true */
/* globals console, window, require, module, KeyboardEvent */

(function(module) {
  'use strict';

  const {getByPath, setByPath} = require('./b8r.byPath.js');

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
    dispatch,
    getParsedEventHandlers,
    implicit_event_types
  } = require('./b8r.events.js');
  Object.assign(b8r, {on, off, enable, disable});
  const {
    addDataBinding,
    removeDataBinding,
    getListInstancePath,
    findLists,
    findBindables,
    getBindings,
    replaceInBindings
  } = require('./b8r.bindings.js');
  Object.assign(b8r, {addDataBinding, removeDataBinding, getListInstancePath});
  const {saveDataForElement, dataForElement} =
      require('./b8r.dataForElement.js');
  const {onAny, offAny, anyListeners, anyElement} =
      require('./b8r.anyEvent.js');
  Object.assign(b8r, {onAny, offAny, anyListeners});
  Object.assign(b8r, require('./b8r.registry.js'));
  b8r.observe(
      () => true,
      (path, source_element) => b8r.touchByPath(path, source_element));

/**
    b8r.register(name, obj);

registers an object by name as data or controller. The names `_component_`,
`_data_` and `_b8r_` are reserved; other similar names may be reserved later.

`_b8r_` is the name of the internal event handlers for bound variables

    b8r.deregister(name); // removes a registered object
    b8r.deregister(); // just cleans up obsolete component data

Remove a registered (named) object. deregister also removes component instance objects
for components no longer in the DOM.

    b8r.setByPath('model', 'data.path, value);
    b8r.setByPath('model.data.path', value);

Set a registered object's property by path. Bound elements will automatically
be updated.

    b8r.getByPath('model', 'data.path');
    b8r.getByPath('model.data.path');

Get a registered object's property by path.

    b8r.pushByPath('model', 'data.path', item, callback);
    b8r.pushByPath('model.data.path', item, callback);

As above, but unshift (and no callback).

    b8r.unshiftByPath('model', 'data.path, item);
    b8r.unshiftByPath('model.data.path, item);

Insert an item into the specified array property. (Automatically updates bound
lists).


> ### Note
>
> Having gained experience with the framework, I am doubling down
> on object paths and simplifying the API in favor of:

>    b8r.get('path.to.value');
>    b8r.set('path.to.value', new_value);

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
    playSavedMessages(name);
  };

  b8r.componentInstances = () =>
      b8r.models().filter(key => key.indexOf(/^c#/) !== -1);

  b8r.debounce = (orig_fn, delay) => {
    var throttle_id;
    return (...args) => {
      if (throttle_id) {
        clearTimeout(throttle_id);
      }
      throttle_id = setTimeout(() => orig_fn(...args), delay);
    };
  };

  b8r.throttle = (orig_fn, min_interval) => {
    var last_call = Date.now() - min_interval;
    return (...args) => {
      const now = Date.now();
      if(now - last_call > min_interval) {
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

  b8r.touchByPath = function(name, path, source_element) {
    const full_path = !path || path === '/' ? name : name + '.' + path;

    b8r.logStart('touchByPath', full_path);

    const lists = b8r.makeArray(
        document.querySelectorAll('[data-list*="' + full_path + '"]'));
    lists.forEach(element => {
      if (element !== source_element) {
        bindList(element);
        b8r.trigger('change', element);
      }
    });
    b8r.makeArray(document.querySelectorAll('[data-bind*="' + full_path + '"]'))
        .filter(notInListTemplate)
        .filter(element => element !== source_element)
        .forEach(bind);

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
      [name, path] = pathSplit(path);
    } else {
      [name, path, value, source_element] = args;
    }
    if (b8r.registered(name)) {
      const model = b8r.get(name);
      if (typeof path === 'object') {
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

  const notInListTemplate = elt => !elt.closest('[data-list]');

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
    return b8r.get(path ? model + '.' + path : model);
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

  b8r.getComponentId = function(elt) {
    const component = elt.closest('[data-component-id]');
    return component ? component.getAttribute('data-component-id') : null;
  };

  b8r.getComponentData = function(elt) {
    const id = b8r.getComponentId(elt);
    return id ? b8r.getByPath(id) : null;
  };

  b8r.getListInstance = function(elt) {
    const instancePath = b8r.getListInstancePath(elt);
    return instancePath ? b8r.getByPath(instancePath) : null;
  };

/**
    b8r.callMethod(method_path, ...args)
    b8r.callMethod(model, method, ...args);

Call a method by name from a registered method. If the relevant model has not
yet been registered
(e.g. it's being loaded asynchronously) it will get the message when it's
registered.
*/

  var saved_messages = [];  // {model, method, evt}

  function saveMethodCall(model, method, args) {
    saved_messages.push({model, method, args});
  }

  function playSavedMessages(for_model) {
    var playbackQueue = [];
    for (var i = saved_messages.length - 1; i >= 0; i--) {
      if (saved_messages[i].model === for_model) {
        playbackQueue.push(saved_messages[i]);
        saved_messages.splice(i, 1);
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
    while (element instanceof Element) {
      if (b8r.getByPath(element.getAttribute('data-component-id'), path) instanceof Function) {
        component_id = element.getAttribute('data-component-id');
        break;
      }
      element = element.parentElement.closest('[data-component-id]');
    }
    return component_id;
  };

  b8r.callMethod = function(...args) {
    var model, method;
    try {
      if (args[0].match(/[\[.]/)) {
        [method, ...args] = args;
        [model, method] = pathSplit(method);
      } else {
        [model, method, ...args] = args;
      }
    } catch (e) {
      debugger;  // jshint ignore:line
    }
    var result = null;
    if (b8r.registered(model)) {
      result = b8r.call(`${model}.${method}`, ...args);
    } else {
      // TODO queue if model not available
      // event is stopped from further propagation
      // provide global wrappers that can e.g. put up a spinner then call the
      // method
      saveMethodCall(model, method, args);
    }
    return result;
  };

  const {keystroke, modifierKeys} = require('./b8r.keystroke.js');
  b8r.keystroke = keystroke;
  b8r.modifierKeys = modifierKeys;

  function handleEvent(evt) {
    var target = anyElement() || evt.target;
    var keystroke = evt instanceof KeyboardEvent ? b8r.keystroke(evt) : {};
    while (target) {
      var handlers = getParsedEventHandlers(target);
      var result = false;
      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        for (var type_index = 0; type_index < handler.types.length;
             type_index++) {
          if (handler.types[type_index] === evt.type &&
              (!handler.type_args[type_index] ||
               handler.type_args[type_index].indexOf(keystroke) > -1)) {
            if (handler.model && handler.method) {
              if (handler.model === '_component_') {
                handler.model = b8r.getComponentWithMethod(target, handler.method);
              }
              if (handler.model) {
                result = b8r.callMethod(handler.model, handler.method, evt, target);
              } else {
                console.warn(`_component_.${handler.method} not found`, target);
              }
            } else {
              console.error('incomplete event handler on', target);
              break;
            }
            if (result !== true) {
              evt.stopPropagation();
              evt.preventDefault();
              return;
            }
          }
        }
      }
      target = target === anyElement() ? evt.target : target.parentElement;
    }
  }

/**
    b8r.trigger(type, target);

Trigger a synthetic implicit (only!) event. Note that you can trigger and
handle
completely made-up events, but if you trigger events that occur naturally the
goal
is for them to be handled exactly as if they were "real".
*/

  b8r.trigger = (type, target) => {
    if (typeof type !== 'string' ||
        !(target.dispatchEvent instanceof Function)) {
      console.error(
          'expected trigger(event_type, target_element)', type, target);
    }
    if (target) {
      const event = dispatch(type, target);
      if (target instanceof Element &&
          implicit_event_types.indexOf(type) === -1) {
        handleEvent(event);
      }
    } else {
      console.warn('b8r.trigger called with no specified target');
    }
  };

  // add touch events if needed
  if (window.TouchEvent) {
    ['touchstart', 'touchcancel', 'touchmove', 'touchend'].forEach(
        type => implicit_event_types.push(type));
  }

  implicit_event_types.forEach(
      type => document.body.addEventListener(type, handleEvent, true));

/**
## Data Binding

Data binding is implemented via the data-bind and data-list attributes.

See the docs on binding data to and from the DOM for more detail.
*/

  const toTargets = require('./b8r.toTargets.js')(b8r);
  const fromTargets = require('./b8r.fromTargets.js')(b8r);

  function pathSplit(full_path) {
    const [, model, , path] = full_path.match(/^(.*?)(\.(.*))?$/);
    return [model, path];
  }

  b8r.onAny(['change', 'input'], '_b8r_', '_update_', true);

  b8r.format = template => {
    template.replace(/\$\{.*?\}/g, (_, path) => b8r.getByPath(path));
  };

  function bind(element) {
    var bindings = getBindings(element);
    for (var i = 0; i < bindings.length; i++) {
      var {targets, path} = bindings[i];
      const value = b8r.get(path);
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

  const {show, hide} = require('./b8r.show.js');
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

  function bindList(list_template, data_path) {
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
    b8r.logStart('bindList', list_path);
    var list = b8r.get(list_path);
    if (!list) {
      return;
    }
    // compute list
    if (method_path) {
      (function() {
        try {
          list = b8r.callMethod(method_path, list, list_template);
        } catch (e) {
          console.error('bindList failed; bad method path', method_path, e);
        }
      }());
      if (!list) {
        throw 'could not compute list; async computed list methods not supported (yet)';
      }
    }
    b8r.show(list_template);
    if (!id_path) {
      removeListInstances(list_template);
    }
    // efficient list update:
    // if we have an id_path we grab existing instances, and re-use those with
    // matching ids
    const existing_list_instances =
        id_path ? b8r.listInstances(list_template) : [];

    var previous_instance = list_template;
    for (var i = list.length - 1; i >= 0; i--) {
      var instance_idx, instance;
      const id = id_path ? id_path + '=' + getByPath(list[i], id_path) : i;
      const itemPath = list_path + '[' + id + ']';
      instance_idx = existing_list_instances.findIndex(
        elt => elt.getAttribute('data-list-instance') === itemPath
      );
      if (instance_idx === -1) {
        instance = list_template.cloneNode(true);
        instance.removeAttribute('data-list');
        instance.setAttribute('data-list-instance', itemPath);
        bindAll(instance, itemPath);
        list_template.parentElement.insertBefore(instance, previous_instance);
      } else {
        instance = existing_list_instances[instance_idx];
        existing_list_instances.splice(instance_idx, 1);
        bindAll(instance);
        if (instance.nextSibling !== previous_instance) {
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

  function bindAll(element, data_path) {
    const random_entry = b8r.getComponentId(element) + '-' + Math.random();
    b8r.logStart('bindAll', random_entry);
    loadAvailableComponents(element, data_path);
    findBindables(element).forEach(elt => bind(elt));
    findLists(element).forEach(elt => bindList(elt, data_path));
    if (element.parentElement) {
      b8r.trigger('change', element.parentElement);
    }
    b8r.logEnd('bindAll', random_entry);
    b8r.cleanupComponentInstances();
  }

  b8r.bindAll = bindAll;

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
    echo: evt => console.log(evt) || true,
    stopEvent: () => {},
    _update_: evt => {
      var elements = b8r.findAbove(evt.target, '[data-bind]', null, true);
      if (evt.target.tagName === 'SELECT') {
        const options =
            b8r.findWithin(evt.target, 'option[data-bind]:not([data-list])');
        elements = elements.concat(options);
      }
      elements.filter(elt => !elt.matches('[data-list]')).forEach(elt => {
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
          b8r.ajax((url || name) + '.component.html')
              .then(
                  source => {
                    resolve(b8r.makeComponent(name, source));
                  },
                  err => {
                    delete component_promises[name];
                    reject(err);
                  });
        }
      });
    }
    return component_promises[name];
  };

  b8r.components = () => Object.keys(components);

  const makeStylesheet = require('./b8r.makeStylesheet.js');

  b8r.makeComponent = function(name, source) {
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
    var load = script ? new Function(
                            'component', 'b8r', 'find', 'findOne', 'data',
                            'register', 'get', 'set', 'on', 'touch',
                            `${script}\n//# sourceURL=${name}(component)`) :
                        false;
    /*jshint evil: false */
    const style = makeStylesheet(`/* ${name} component */\n` + css);
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

    b8r.find('[data-component="' + name + '"]')
        .forEach(element => {
          if (!element.closest('[data-list]') &&
              !element.matches('[data-component-id')) {
            b8r.insertComponent(component, element);
          }
        });
    return component;
  };

  function loadAvailableComponents(element, data_path) {
    b8r.findWithin(element || document.body, '[data-component]')
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
component's private instance data. (Usually
data is passed automatically from parent components or via binding, e.g.
`data-bind="component=path.to.data` binds that
data to the component).
*/

  function getDataPath(data, element) {
    if (typeof data === 'string') {
      return data;
    }
    const data_parent =
        element ? element.closest('[data-path],[data-list-instance]') : false;
    return data_parent ?
        data_parent.getAttribute('data-path') ||
            data_parent.getAttribute('data-list-instance') :
        false;
  }

  var component_count = 0;
  b8r.insertComponent = function(component, element, data) {
    const data_path = getDataPath(data, element);
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
    if (!data || data_path) {
      data = dataForElement(
          element,
          b8r.getComponentData(element) || b8r.getListInstance(element) || {});
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
    if (data_path) {
      element.setAttribute('data-path', data_path);
    }
    const register = component_data =>
        b8r.register(component_id, component_data);
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
    bindAll(element);
    return element;
  };

}(module));
