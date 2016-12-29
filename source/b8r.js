/**
#bindinator
Copyright © 2016 Tonio Loewald

Binds data and methods to the DOM and lets you quickly turn chunks of markup, style, and code
into reusable components so you can concentrate on your project.
*/
/* jshint esnext:true, loopfunc:true */
/* globals console, window, require, module */

(function(module){
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');

function b8r(){}

module.exports = b8r;

require('./b8r.dom.js')(b8r);

b8r.modifierKeys = {
	meta: '⌘',
	ctrl: '⌃',
	alt: '⌥',
	escape: '⎋',
	shift: '⇧'
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

	b8r.setByPath(name, path, value);

Set a registered object's property by path. Bound elements will automatically be updated.

	b8r.getByPath(name, path);

Get a registered object's property by path.

	b8r.pushByPath(name, path, item);

Insert an item into the specified array property. (Automatically updates bound lists).

	b8r.removeListInstance(element);

Removes a data-list-instance's corresponding list member and any other bound data-list-instances.
*/

b8r.makeArray = arrayish => [].slice.apply(arrayish);

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
	const lists = b8r.makeArray(document.querySelectorAll('[data-list*="' + full_path + '"]'));
	lists.forEach(element => {
		if(element !== source_element){
			bindList(element);
			b8r.trigger('change', element);
		}
	});
	const elements = b8r.makeArray(document.querySelectorAll('[data-bind*="' + full_path + '"]'));
	elements.forEach(element => element !== source_element && bind(element));
};

b8r.setByPath = function (name, path, value, source_element) {
	if (models[name]) {
		const model = models[name];
		if(typeof path === 'object'){
			Object.assign(model, path);
			b8r.touchByPath(name, '/', source_element);
		} else {
			setByPath(model, path, value);
			b8r.touchByPath(name, path, source_element);
		}
		// this may update some false positives, but very few
	}
};

b8r.pushByPath = function(name, path, value, callback) {
	if (models[name]) {
		const list = getByPath(models[name], path);
		list.push(value);
		if (callback) {
			callback(list);
		}
		b8r.touchByPath(name, path);
	}
};

b8r.getComponentData = function(elt) {
	const component = elt.closest('[data-component-id]');
	return component ? b8r.getByPath(component.getAttribute('data-component-id')) : null;
};

b8r.getListInstance = function(elt) {
	try {
		const [,model,path] = elt.closest('[data-list-instance]').getAttribute('data-list-instance').match(/^([^\.]*)\.(.*)$/);
		return b8r.getByPath(model, path);
	} catch(e) {
		return null;
	}
};

b8r.removeListInstance = function(elt) {
  elt = elt.closest('[data-list-instance]');
  if (elt) {
	  const ref = elt.getAttribute('data-list-instance');
	  try {
		  const [,model,path,key] = ref.match(/^([^.]+)\.(.+)\[(\d+)\]$/);
		  b8r.removeByPath(model, path, key);
	  } catch(e) {
	  	console.error('cannot find list item for instance', ref);
	  }
  } else {
  	console.error('cannot remove list instance for', elt);
  }
};

b8r.removeByPath = function(name, path, key) {
	if (models[name]) {
		const list = getByPath(models[name], path);
		if (list && list[key]) {
			if (Array.isArray(list)) {
				list.splice(key, 1);
			} else {
				delete list[key];
			}
			b8r.touchByPath(name, path);
		}
	}
};

b8r.getByPath = function (name, path) {
	if (name && models[name]) {
		return getByPath(models[name], path || '/');
	}
};

b8r.listItems = element => b8r.makeArray(element.children)
                              .filter(elt => elt.matches('[data-list-instance]'));
b8r.listIndex = element => b8r.listItems(element.parentElement).indexOf(element);

/**
	b8r.on(element, event_type, model_name, method_name);

creates an implicit event-binding data attribute:
	
	data-event="event_type:module_name.method_name"

Multiple handlers are semicolon-delimited.
You can bind multiple event types separated by commas, e.g. click,keyup:do.something

**Note**: if you link two event types to the same method separately they will NOT be collated.

### Keyboard Events

To make it easy to handle specific keystrokes, you can bind to keystrokes by name, e.g.

	data-bind="keydown(meta-KeyS)"

For your convenience, there's a *Keyboard Event Utility*.
*/
function getEventHandlers(element) {
	const source = element.getAttribute('data-event');
	const existing = source ? 
									 source.
									 replace(/\s*(^|$|[,:;])\s*/g, '$1').split(';').
									 filter(handler => handler.trim()) : 
									 [];
	return existing;
}

function makeHandler(event_type, object, method) {
	if (typeof event_type === 'string') {
		event_type = [event_type];
	}
	if(!Array.isArray(event_type)) {
		console.error('makeHandler failed; bad event_type', event_type);
		return;
	}
	return event_type.sort().join(',') + ':' + object + '.' + method;
}

b8r.on = function (element, event_type, object, method, prepend) {
	// check if handler already exists
	// var existingHandlers = implicitEventHandlers(element);
	if (typeof object === 'object' && object.model) {
		return b8r.on(element, event_type, object.model, object.method);
	}
	if (!(element instanceof HTMLElement)) {
		console.error('bind bare elements please, not', element);
		return;
	}
	if(typeof object !== 'string' || typeof method !== 'string') {
		console.error('implicit bindings are by name, not', object, method);
		return;
	}
	const handler = makeHandler(event_type, object, method);
	const existing = getEventHandlers(element);
	if(existing.indexOf(handler) === -1) {
		if (prepend) {
			existing.unshift(handler);
		} else {
			existing.push(handler);
		}
	}
	if (existing.length) {
		element.setAttribute('data-event', existing.join(';'));
	} else {
		element.removeAttribute('data-event');
	}
};

b8r.off = function(element, event_type, object, method) {
	const existing = element.getAttribute('data-event').split(';');
	const handler = makeHandler(event_type, object, method);
	const idx = existing.indexOf(handler);
	if (idx > -1) {
		existing.splice(idx, 1);
		if (existing.length) {
			element.setAttribute('data-event', existing.join(';'));
		} else {
			element.removeAttribute('data-event');
		}
	}
};

/**
### Special event handling

	b8r.onAny(event_type, object, method) => handlerRef

creates an event handler that will get first access to any event; returns a reference for purposes of removal
	
	b8r.offAny(handlerRef,...)

removes all the handlerRefs passed

**Note** that this works *exactly* like an invisible element in front of everything else
for purposes of propagation.

*/
var anyElement = null;
b8r.onAny = function(event_type, object, method) {
	if (!anyElement) {
		anyElement = b8r.create('div');
	}
	b8r.on(anyElement, event_type, object, method);
};

b8r.offAny = function (event_type, object, method) {
	if (anyElement) {
		b8r.off(anyElement, event_type, object, method);
		if (!anyElement.getAttribute('data-event')) {
			anyElement = null;
		}
	}
};

/*

	b8r.implicitEventHandlers(element)

returns an array of parsed implicit event handlers for an element, e.g.

 	data-event="type1:model1.method1;type2,type3:model2.method2"

is returned as

 	[
		{ types: ["type1"], model: "model1", method: "method1"},
		{ types: ["type2", "type3"], model: "model2", method: "method2"}
	]
*/
function implicitEventHandlers (element) {
	var source = element.getAttribute('data-event');
	var handlers = [];
	if (source) {
		source = source.split(';').filter(elt => !!elt);
		handlers = source.map(function(instruction){
			var [type, handler] = instruction.split(':');
			if (!handler) {
				if(instruction.indexOf('.')) {
					console.error('bad event handler (missing event type)', instruction, 'in', element);
				} else {
					console.error('bad event handler (missing handler)', instruction, 'in', element);
				}
				return { types: [] };
			}
			var [model, method] = handler.trim().split('.');
			var types = type.split(',').sort();
			return { 
				types: types.map(s => s.split('(')[0].trim()),
				type_args: types.map(s => {
					var args = s.match(/\(([^)]+)\)/);
					return args && args[1] ? args[1].split(',') : false;
				}),
				model,
				method,
			};
		});
	}
	return handlers;
}

/**
	b8r.callMethod(model, method, evt);

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

b8r.callMethod = function () {
	const [model, method, ...args] = arguments;
	var result = null;
	if ( models[model] ) {
		if (models[model][method] instanceof Function) {
			result = models[model][method].apply(null, args);
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
	b8r.trigger(type, target);

Trigger a synthetic implicit (only!) event. Note that you can trigger and handle
completely made-up events, but if you trigger events that occur naturally the goal
is for them to be handled exactly as if they were "real".

*/
b8r.trigger = function(type, target) {
	if (typeof type !== 'string' || !(target instanceof HTMLElement)) {
		console.error ('expected trigger(event_type, target_element)', type, target);
	}
	if (target) {
		var stopPropagation = () => {};
		var preventDefault = () => {};
		handleEvent({type, target, stopPropagation, preventDefault});	
	} else {
		console.warn('b8r.trigger called with no specified target');
	}
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
	code.push(evt.code || '');
	return code.join('-');
};

function handleEvent (evt) {
	var target = anyElement ? anyElement : evt.target;
	var keystroke = b8r.keystroke(evt);
	var done = false;
	while (target && !done) {
		var handlers = implicitEventHandlers(target);
		var result = false;
		for (var i = 0; i < handlers.length; i++) {
			var handler = handlers[i];
			for (var type_index = 0; type_index < handler.types.length; type_index++) {
				if(
					handler.types[type_index] === evt.type && 
						(!handler.type_args[type_index] || handler.type_args[type_index].indexOf(keystroke) > -1)
				) {
					if( handler.model && handler.method ) {
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

var implicit_event_types = [
	'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'click',
	'dragstart', 'dragenter', 'dragover', 'dragleave', 'dragend', 'drop',
	'scroll',
	'input', 'change',
	'keydown', 'keyup',
	'focus', 'blur' // more to follow
];

if (window.TouchEvent) {
	implicit_event_types = implicit_event_types.concat(['touchstart', 'touchcancel', 'touchmove', 'touchend']);
}

implicit_event_types.forEach(type => document.body.addEventListener(type, handleEvent, true));

/*
	This is where we define all the methods for binding to/from the DOM
*/

/**
## Data Binding

Data biding is implemented via the data-bind and data-list attributes.
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
	var [,targets, source] = binding.trim().match(/^([^=]*)=(.*)$/m).map(s => s.trim());
	targets = targets.split(',').map(function(target){ 
		var parts = target.match(/(\w+)(\(([^)]+)\))?/);
		if(!parts) {
			console.error('bad target', target, 'in binding', binding);
			return;
		}
		return parts ? { target: parts[1], key: parts[3] } : null;
	});
	if (!source) {
		console.error('binding does not specify source', binding);
	}
	var [, model,, path] = source.match(/([^.;]*)(\.(.+))?/);
	return {targets, model, path: path};
}

function getBindings (element) {
	return element.getAttribute('data-bind').split(';').filter(s => !!s).map(parseBinding);
}

function buildTargets (binding) {
	return binding.targets.map(target => target.target + (target.key ? '(' + target.key + ')' : ''));
}

function addBasePathToBindings(element, bindings, basePath) {
	if (basePath) {
		element.setAttribute(
			'data-bind',
			bindings.map(
				binding => 
				buildTargets(binding) +
					'=' + basePath +
					'.' + binding.model +
					binding.path).join(';')
		);
	}
}

function findBindables (element) {
	return b8r.findWithin(element, '[data-bind]', true)
			  .filter(elt => {
			  	var list = elt.closest('[data-list],[data-list-instance]');
			  	return !list || list === element || !element.contains(list);
			  });
}

function bind (element, data, basePath) {
	var bindings = getBindings(element);
	addBasePathToBindings(element, bindings, basePath);
	for (var i = 0; i < bindings.length; i++) {
		var {targets, model, path} = bindings[i];
		var obj = data || models[model];
		var _toTargets = targets.filter(t => toTargets[t.target]);
		var _fromTargets = targets.filter(t => fromTargets[t.target]);
		if (obj && _toTargets.length) {
			_toTargets.forEach(t => {
				toTargets[t.target](element, getByPath(obj, path), t.key, obj);
			});
		} else {
			// save message for when source is registered
		}
		if (_fromTargets.length) {
			b8r.on(element, ['change', 'input'], '_b8r_', 'update', true);
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

b8r.hide = function (element) {
	if (element.getAttribute('data-orig-display') === null && (element.style.display && element.style.display !== 'none')) {
		element.setAttribute('data-orig-display', element.style.display);
		b8r.findWithin(element, '[data-event*="hide"]').forEach(elt => b8r.trigger('hide', elt));
	}
	element.style.display = 'none';
};

b8r.show = function (element) {
	if (element.style.display === 'none') {
		element.style.display = element.getAttribute('data-orig-display') || '';
		b8r.findWithin(element, '[data-event*="show"]').forEach(elt => b8r.trigger('show', elt));
	}
};

function bindList (element, data, basePath) {
	const [list_path, id_path] = element.getAttribute('data-list').split(':');
	var model, path;
	try {
		[,model,, path] = list_path.match(/^([^\.]*)(\.(.*))?$/);
	} catch(e) {
		console.error('bindList failed', list_path, e);
	}
	if (model === '' && !data && !basePath) {
		return;
	}
	var list = data ? getByPath(data, path) : b8r.getByPath(model, path);
	if (!list) {
		return;
	}
	while(
		element.previousSibling &&
		(
			!element.previousSibling.matches ||
			element.previousSibling.matches('[data-list-instance]')
		)
	) {
		element.parentElement.removeChild(element.previousSibling);
	}
	b8r.show(element);
	const fragment = b8r.fragment();
	for (var i = 0; i < list.length; i++) {
		var instance;
		const id = id_path ? id_path + '=' + getByPath(list[i], id_path): i;
		const itemPath = list_path + '[' + id + ']';
		instance = element.parentElement.querySelector(`[data-list-instance="${itemPath}"]`);
		if(!instance) {
			instance = element.cloneNode(true);
			instance.removeAttribute('data-list');
			instance.setAttribute('data-list-instance', itemPath);
		}
		bindAll(instance, list[i], itemPath);
		fragment.appendChild(instance);
	}
	b8r.hide(element);
	element.parentElement.insertBefore(fragment, element);
}

function bindAll(element, data, basePath) {
	loadAvailableComponents(element, data);
	findBindables(element).forEach(elt => bind(elt, data, basePath));
	findLists(element).forEach(elt => bindList(elt, data, basePath));
	if(element.parentElement) {
		b8r.trigger('change', element.parentElement);
	}
}

b8r.bindAll = bindAll;

models._b8r_ = {
	echo: evt => { console.log(evt); return true; },
	stopEvent: () => {},
	update: function(evt, target) {
		var bindings = getBindings(target);
		for (var i = 0; i < bindings.length; i++) {
			var {targets, model, path} = bindings[i];
			targets = targets.filter(t => fromTargets[t.target]);
			targets.forEach(t => {
				b8r.setByPath(model, path, fromTargets[t.target](target, t.key), target);
			});
		}
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
b8r.component = function (name, url) {
	if (url === undefined) {
		url = name;
		name = url.split('/').pop();
	}
	return new Promise(function(resolve, reject) {
		if (components[name]) {
			resolve(components[name]);
		} else {
			b8r.ajax((url || name) + '.component.html').then(source => {
				resolve(b8r.makeComponent(name, source));
			}, err => reject(err));
		}
	});
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
		'touch',
		`${script}\n//# sourceURL=${name}.component.html`
	) : false;
/*jshint evil: false */
	var style;
	if (css) {
		style = b8r.create('style');
		style.type = 'text/css';
		style.appendChild(b8r.text(css));
		document.head.appendChild(style);
	}
	var component = {name: name, style: css ? style : false, view: div, load: load, _source: source};
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
	var targets = b8r.find('[data-component="' + name + '"]');
	targets.forEach(element => b8r.insertComponent(component, element));
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

	return b8r.getComponentData(target_element) || {};
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
		if (!target.matches('[data-component-id]')) {
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
data to the component").
*/
var component_count = 0;
b8r.insertComponent = function (component, element, data) {
	if (!element) {
		element = b8r.create('div');
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
	if (!data) {
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
		b8r.findWithin(element, '[data-bind*="_component_"],[data-list*="_component_"],[data-event*="_component_"]').forEach(elt => {
			['data-bind', 'data-list', 'data-event'].forEach(attr => {
				const val = elt.getAttribute(attr);
				if(val) {
					elt.setAttribute(attr, val.replace(/_component_|_component_/g, component_id));
				}
			});
		});
		var children_dest = b8r.findOneWithin(element, '[data-children]');
		if (children.firstChild && children_dest) {
			b8r.empty(children_dest);
			b8r.moveChildren(children, children_dest);
		}
	}
	element.setAttribute('data-component-id', component_id);
	const register = data => b8r.register(component_id, data);
	if (component.load) {
		const get = path => b8r.getByPath(component_id, path);
		const set = (path, value) => {
			b8r.setByPath(component_id, path, value);
			b8r.trigger('change', element);
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
