// Bind-O-Matic.js Copyright (c) 2016 Tonio Loewald
/**
#BindOMatic

Binds your data and methods so you can concentrate on your actual goals.
*/
/* jshint esnext:true */
/* globals console, window */

'use strict';

function BOM(){}

/**
	BOM.find(selector);       					// syntax sugar for querySelectorAll, returns proper array
	BOM.findOne(selector);        				// syntax sugar for querySelector
	BOM.findWithin(element, selector);			// find scoped within element
	BOM.findWithin(element, selector, true);	// find scoped within element, including the element itself
	BOM.findOneWithin(element, selector);		// findOne scoped within element
	BOM.findOneWithin(element, selector, true);	// findOne scoped within element, including the element itself
	BOM.makeArray(arrayish);					// creates a proper array from something array-like
	BOM.succeeding(element, selector);			// next succeeding sibling matching selector
*/

// TODO
// Debug versions of findOne should throw if not exactly one match
BOM.find = selector => BOM.makeArray(document.querySelectorAll(selector));
BOM.findOne = document.querySelector.bind(document);
BOM.findWithin = (element, selector, include_self) => {
		var list = BOM.makeArray(element.querySelectorAll(selector));
		if (include_self && element.matches('[data-bind]')) {
			list.unshift(element);
		}
		return list;
	};
BOM.findOneWithin = (element, selector, include_self) => include_self && element.matches(selector) ? element : element.querySelector(selector);
BOM.makeArray = arrayish => [].slice.apply(arrayish);
BOM.succeeding = (element, selector) => {
	while(element.nextSibling && !element.nextElementSibling.matches(selector)){
		element = element.nextElementSibling;
	}
	return element.nextElementSibling;
};

/**
	BOM.id();             // syntax sugar for findElementById
*/
BOM.id = document.getElementById.bind(document);

function getByPath(obj, path) {
	if(path && path !== '/') {
		path = path.split(/\.|\[/);
		while (path.length && obj) {
			var key = path.shift();
			if (key.substr(-1) === ']') {
				key = parseInt(key, 10);
			}
			obj = obj[key];
		} 
	}
	return obj;
}

function setByPath(obj, path, val) {
	path = path.split(/\.|\[/);
	while (path.length > 1) {
		var key = path.shift();
		if (key.substr(-1) === ']') {
			key = parseInt(key, 10);
		}
		if (!obj[key]) {
			obj[key] = path[0].substr(-1) === ']' ? [] : {};
		}
		obj = obj[key];
	}
	if (path[0].substr(-1) === ']') {
		obj[parseInt(path[0], 10)] = val;
	} else {
		obj[path[0]] = val;
	}
}

var models = {};

/**
	BOM.register(name, obj);						// register an object by name as data or controller
		// the names _DATA_ and _BOM_ are reserved; other similar namess may be reserved later
		// binding to _DATA_ explicitly means you will only be bound to an explicit object
		// _BOM_ is the name of the internal event handlers for bound variables
	BOM.deregister(name);								// remove a registered object
	BOM.setByPath(name, path, value);		// set a registered object's property by path
	BOM.getByPath(name, path);					// get a registered object's property by path
*/

BOM.register = function (name, obj) {
	if (name.match(/^_[^_]*_$/)) {
		throw "cannot register object as " + name + ", all names starting and ending with a single '_' are reserved.";
	}
	models[name] = obj;
	if (BOM.getByPath(models[name], 'add')) {
		models[name].add();
	}
	BOM.find('[data-bind*="' + name + '"]').forEach(elt => {
		bind(elt);
		BOM.trigger('change', elt);
	});
	BOM.find('[data-list*="' + name + '"]').forEach(elt => {
		bindList(elt);
		BOM.trigger('change', elt);
	});
	playSavedMessages(name);
};

BOM.isRegistered = function(name) {
	return models[name] !== undefined;
};

BOM.deregister = function (name) {
	if (BOM.getByPath(models[name], 'remove')) {
		models[name].remove();
	}
	delete(models[name]);
};

BOM.setByPath = function (name, path, value, source_element) {
	if (models[name]) {
		setByPath(models[name], path, value);
		// this may update some false positives, but very few
		var elements = BOM.makeArray(document.querySelectorAll('[data-bind*="=' + name + '.' + path + '"]'));
		elements.forEach(element => element !== source_element && bind(element));
	}
};

BOM.getByPath = function (name, path) {
	if (name && models[name]) {
		return getByPath(models[name], path || '/');
	}
};

/**
	BOM.on(element, event_type, model_name, method_name) // creates an implicit event-binding data attribute
		// data-event="event_type:module_name.method_name"
		// multiple handlers are semicolon-delimited
		// you can bind multiple event types separated by commas, e.g. click,keyup:do.something
		// NOTE if you link two event types to the same method separately they will NOT be collated
		// TODO convenience event types, e.g. keyup(arrow) or keyup(meta-c,ctrl-y)
*/
function getEventHandlers(element) {
	const source = element.getAttribute('data-event');
	const existing = source ? source.replace(/\s*(^|$|[,:;])\s*/g, '$1').split(';') : [];
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

BOM.on = function (element, event_type, object, method) {
	// check if handler already exists
	// var existingHandlers = implicitEventHandlers(element);
	if (typeof object === 'object' && object.model) {
		return BOM.on(element, event_type, object.model, object.method);
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
		existing.push(handler);
	}
	if (existing.length) {
		element.setAttribute('data-event', existing.join(';'));
	} else {
		element.removeAttribute('data-event');
	}
};

BOM.off = function(element, event_type, object, method) {
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
	BOM.onAny(event_type, object, method) => handlerRef // creates an event handler that will get first access to any event
		// returns a reference for purposes of removal
	BOM.offAny(handlerRef,...) // removes all the handlerRefs passed

	Note that this works *exactly* like an invisible element in front of everything else
	for purposes of propagation.
*/
var anyElement = null;
BOM.onAny = function(event_type, object, method) {
	if (!anyElement) {
		anyElement = BOM.create('div');
	}
	BOM.on(anyElement, event_type, object, method);
};

BOM.offAny = function (event_type, object, method) {
	if (anyElement) {
		BOM.off(anyElement, event_type, object, method);
		if (!anyElement.getAttribute('data-event')) {
			anyElement = null
		}
	}
};

/*
 	returns an array of parsed implicit event handlers for an element
 	data-event="type1:model1.method1;type2,type3:model2.method2" is returned as
 	[
		{ types: ["type1"], model: "model1", method: "method1"},
		{ types: ["type2", "type3"], model: "model2", method: "method2"}
	]
*/
function implicitEventHandlers (element) {
	var source = element.getAttribute('data-event');
	var handlers = [];
	if (source) {
		source = source.split(';');
		handlers = source.map(function(instruction){
			var [type, handler] = instruction.split(':');
			if (!handler) {
				console.error('missing event handler', instruction, 'in', element);
				return { types: [] };
			}
			var [model, method] = handler.trim().split('.');
			var types = type.split(',').sort();
			return { 
				types: types.map(s => s.split('(')[0].trim()),
				type_args: types.map(s => {
					var args = s.match(/\(([^)]+)\)/);
					return args && args[1].split(',');
				}),
				model,
				method,
			};
		});
	}
	return handlers;
}

/**
	BOM.callMethod(model, method, evt);	// Call a method by name from a registered method
*/

var saved_messages = []; // {model, method, evt}

function saveMethodCall(model, method, evt) {
	saved_messages.push({model, method, evt});
}

function playSavedMessages(for_model) {
	var playbackQueue = [];
	for (var i = saved_messages.length - 1; i >= 0; i--) {
		if (saved_messages[i].model === for_model) {
			playbackQueue.push(saved_messages[i]);
			delete saved_messages[i];
		}
	}
	while (playbackQueue.length) {
		var {model, method, evt} = playbackQueue.pop();
		BOM.callMethod(model, method, evt);
	}
}

BOM.callMethod = function (model, method, evt) {
	var result = null;
	if(model === '_component_') {
		var view_controller;
		var target = evt.target.closest('[data-component-uuid]');
		while(!(view_controller && view_controller[method]) && target) {
			var uuid = target.getAttribute('data-component-uuid');
			if (models._BOM_components_ && uuid) {
				view_controller = models._BOM_components_[uuid];
				target = target.parentElement.closest('[data-component-uuid]');
      }
		}
		if (!view_controller) {
			console.error('event bound to _component_ found no view_controller', evt.target);
		} else {
			result = view_controller[method](evt);	
		}
	} else if ( models[model] ) {
		result = models[model][method](evt);
	} else {
		// TODO queue if model not available
		// event is stopped from further propagation
		// provide global wrappers that can e.g. put up a spinner then call the method
		saveMethodCall(model, method, evt);
	}
	return result;
};

/**
	BOM.trigger(type, target); // trigger a synthetic implicit (only!) event
*/
BOM.trigger = function(type, target) {
	if (target) {
		var stopPropagation = () => {};
		var preventDefault = () => {};
		handleEvent({type, target, stopPropagation, preventDefault});	
	} else {
		console.warn('BOM.trigger called with no specified target');
	}
};

/**
	## Keystrokes

	BOM leverages the modern browser's event "code" to identify keystrokes,
	and uses a normalized representation of modifier keys (in alphabetical)
	order.

	* __alt__ represents the alt or option keys
	* __ctrl__ represents the control key
	* __meta__ represents the windows, command, or meta keys
	* __shift__ represents the shift keys

	BOM.keystroke(event) // returns normalized keystroke representation
*/
BOM.keystroke = function(evt) {
	var code = [];
	evt.altKey && code.push('alt');
	evt.ctrlKey && code.push('ctrl');
	evt.metaKey && code.push('meta');
	evt.shiftKey && code.push('shift');
	code.push(evt.code || '');
	return code.join('-');
};

function handleEvent (evt) {
	var target = anyElement ? anyElement : evt.target;
	var keystroke = BOM.keystroke(evt);
	var done = false;
	var result;
	while (target && !done) {
		var handlers = implicitEventHandlers(target);
		for (var i = 0; i < handlers.length; i++) {
			var handler = handlers[i];
			for (var type_index = 0; type_index < handler.types.length; type_index++) {
				if(
					handler.types[type_index] === evt.type && 
						(!handler.type_args[type_index] || handler.type_args[type_index].indexOf(keystroke) > -1)
				) {
					result = BOM.callMethod(handler.model, handler.method, evt);
					if (result !== true) {
						// use stopPropagation?!
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
	'mousedown', 'mouseup', 'mousemove', 'click',
	'input', 'change',
	'keydown', 'keyup',
	'focus', // more to follow
];

implicit_event_types.forEach(type => document.body.addEventListener(type, handleEvent));

/*
	This is where we define all the methods for binding to/from the DOM
*/

/**
	## data-bind

	### flushing data to the DOM

	* value -- sets the element's value (works for input, select, textarea)
	* checked -- toggles the element's checked based on truthiness of value
	* text -- sets the element's textContent
	* attr(some_attribute) -- sets the element's specified attribute
	* style -- sets the element's specified style property
	* class(class_name) -- toggles the specified class based on the truthiness of value
	* show_if -- shows the (otherwise hidden) element base on the truthiness of the value
	* show_if(value) -- shows the (otherwise hidden) element for matching value
	* method(model.method) -- calls the specified registered method, passing the element, valuem and the data object as parameters
	* component_map(value:component|other_value:other_component|yet_another_component) -- loads and binds the first matching component
	* json -- dumps the value stringified into the textContent of the element (mainly for debugging)
*/
var toTargets = {
	value: function(element, value){
		switch (element.getAttribute('type')) {
			case 'radio': 
				element.checked = element.value === value;
				break;
			case 'checkbox':
				element.checked = value;
				break;
			default:
				element.value = value;
		}
	},
	checked: function(element, value) {
		element.checked = !!value;
	},
	text: function(element, value){
		element.textContent = value;
	},
	attr: function(element, value, dest) {
		if (value === undefined || value === null) {
			element.removeAttribute(dest);
		} else {
			element.setAttribute(dest, value);	
		}
	},
	style: function(element, value, dest) {
		element.style[dest] = value;
	},
	class: function(element, value, class_to_toggle) {
		if (value) {
			element.classList.add(class_to_toggle);
		} else {
			element.classList.remove(class_to_toggle);
		}
	},
	show_if: function(element, value, dest) {
		if (dest !== undefined ? value == dest : value) {
			BOM.show(element);
		} else {
			BOM.hide(element);
		}
	},
	method: function(element, value, dest, data) {
		var [model, method] = dest.split('.');
		BOM.getByPath(model, method)(element, value, data);
	},
	json: function(element, value) {
		element.textContent = JSON.stringify(value, false, 2);
	},
	component_map: function(element, value, dest, data) {
		if (element.getAttribute('data-component-uuid')) {
			return;
		}
		var component_options = dest.split('|');
		var component_name;
		for (var i = 0; i < component_options.length; i++) {
			var parts = component_options[i].split(':');
			if (parts.length === 1 || parts[0] == value) {
				component_name = parts.pop();
				break;
			}
		}
		if (component_name) {
			BOM.insertComponent(component_name, element, data);
		}
	}
};

/**
	### collecting data from the DOM

	* value -- pulls the element's value from the DOM
	* checked -- pulls the element's checked value from the DOM
	* text -- pulls the element's textContent from the DOM
*/

var fromTargets = {
	value: function(element){
		return element.value;
	},
	checked: function(element) {
		return element.checked;
	},
	text: function(element){
		return element.textContent;
	}
};

function parseBinding (binding) {
	var [targets, source] = binding.split('=');
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
	return {targets, model, path};
}

function getBindings (element) {
	return element.getAttribute('data-bind').split(';').map(parseBinding);
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
	return BOM.findWithin(element, '[data-bind]', true)
			  .filter(elt => {
			  	var list = elt.closest('[data-list]');
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
			BOM.on(element, ['change', 'input'], '_BOM_', 'update');
		}
	}
}

function findLists (element) {
	return BOM.findWithin(element, '[data-list]')
			  .filter(elt => {
			  	var list = elt.parentElement.closest('[data-list]');
			  	return !list || list === element || !element.contains(list);
			  });
}

BOM.hide = function (element) {
	if (element.getAttribute('data-orig-display') !== null && (element.style.display && element.style.display !== 'none')) {
		element.setAttribute('data-orig-display', element.style.display);
		BOM.findWithin(element, '[data-event*="hide"]').forEach(elt => BOM.trigger('hide', elt));
	}
	element.style.display = 'none';
};

BOM.show = function (element) {
	if (element.style.display === 'none') {
		element.style.display = element.getAttribute('data-orig-display') || '';
		BOM.findWithin(element, '[data-event*="show"]').forEach(elt => BOM.trigger('show', elt));
	}
};

function bindList (element, data, basePath) {
	var [list_path] = element.getAttribute('data-list').split(':');
	var model, path;
	try {
		[,model,, path] = list_path.match(/^([^\.]*)(\.(.*))?$/);
	} catch(e) {
		console.error('bindList failed', list_path, e);
	}
	if (model === '' && !data && !basePath) {
		return;
	}
	var list = data ? getByPath(data, path) : BOM.getByPath(model, path);
	if (!list || !list.length) {
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
	BOM.show(element);
	for (var i = 0; i < list.length; i++) {
		var instance = element.cloneNode(true);
		instance.removeAttribute('data-list');
		const itemPath = list_path + '[' + i + ']';
		instance.setAttribute('data-list-instance', itemPath);
		bindAll(instance, list[i], itemPath);
		element.parentElement.insertBefore(instance, element);
	}
	BOM.hide(element);
}

function bindAll(element, data, basePath) {
	// consider passing data and basePath here...
	loadAvailableComponents(element, data);
	findBindables(element).forEach(elt => bind(elt, data, basePath));
	findLists(element).forEach(elt => bindList(elt, data, basePath));
	BOM.trigger('change', element);
}

BOM.bindAll = bindAll;

models._BOM_ = {
	update: function(evt) {
		var bindings = getBindings(evt.target);
		for (var i = 0; i < bindings.length; i++) {
			var {targets, model, path} = bindings[i];
			targets = targets.filter(t => fromTargets[t.target]);
			targets.forEach(t => {
				BOM.setByPath(model, path, fromTargets[t.target](evt.target, t.key), evt.target);
			});
		}
	},
};

/**
	BOM.ajax(url, method, data).then(success, failure)
	BOM.json(url, method, data).then(success, failure)
*/
BOM.ajax = function (url, method, request_data, config) {
	return new Promise(function(resolve, reject) {
		config = config || {};
		if (!config.headers) {
			config.headers = [];
		}
		var request = new XMLHttpRequest();
		request.open(method || 'GET', url, true);
		request.onreadystatechange = () => {
			if (request.readyState === XMLHttpRequest.DONE) {
				switch (Math.floor(request.status / 100)) {
					case 5:
					case 4:
						reject(request);
						break;
					case 3:
						// redirect of some kind
						break;
					case 2:
						resolve(request.responseText);
						break;
				}
			}
		};
		if (typeof request_data === 'object') {
			request_data = JSON.stringify(request_data);
			config.headers.push({
				prop: 'Content-Type',
				value: 'application/json; charset=utf-8'
			});
		}
		config.headers.forEach(header => request.setRequestHeader(header.prop, header.value));
		request.send(request_data);
	});
};

BOM.json = function (url, method, request_data, config) {
	return new Promise(function(resolve, reject) {
		BOM.ajax(url, method, request_data, config).then(data => {
			try {
				resolve(JSON.parse(data || 'null'));
			} catch(e) {
				console.error('Failed to parse data', data, e);
			}
		}, reject);
	});
};

BOM.jsonp = function (url, method, request_data, config) {
	return new Promise(function(resolve, reject) {
		BOM.ajax(url, method, request_data, config).then(data => {
			try {
				resolve(JSON.parse(data || 'null'));
			} catch(e) {
				console.error('Failed to parse data', data, e);
			}
		}, reject);
	});
};

var components = {};

/**
	BOM.text() // syntax sugar for document.createTextNode()
	BOM.fragment() // syntax sugar for document.createDocumentFragment();
	BOM.create('div') // syntax sugar for document.createElement('div');
*/

BOM.text = document.createTextNode.bind(document);
BOM.fragment = document.createDocumentFragment.bind(document);
BOM.create = document.createElement.bind(document);

/**
	BOM.empty(element); // removes contents of element
*/
BOM.empty = function (element) {
	while (element.lastChild) {
		element.removeChild(element.lastChild);
	}
};

/**
	BOM.moveChildren(source, dest); // copies contents of source to dest
*/
BOM.moveChildren = function (source, dest) {
	while (source.firstChild) {
		dest.appendChild(source.firstChild);
	}
};

/**
	BOM.copyChildren(source, dest); // copies contents of source to dest
*/
BOM.copyChildren = function (source, dest) {
	var element = source.firstChild;
	while (element) {
		dest.appendChild(element.cloneNode(true));
		element = element.nextSibling;
	}
};

/**
	BOM.component(name, url); // loads component from url
	  // registers it as "name"
	  // the extension .component.html is appended to url
	  // component will automatically be inserted as expected once loaded
	  // resolve will be passed the loaded component
*/
BOM.component = function (name, url) {
	return new Promise(function(resolve, reject) {
		if (components[name]) {
			resolve(components[name]);
		} else {
			BOM.ajax(url + '.component.html').then(source => {
				resolve(BOM.makeComponent(name, source));
			}, err => reject(err));
		}
	});
};

BOM.makeComponent = function(name, source) {
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

	var div = BOM.create('div');
	div.innerHTML = content;
/*jshint evil: true */
	var load = script ? new Function('component', 'BOM', 'find', 'findOne', 'data', script) : false;
/*jshint evil: false */
	var style;
	if (css) {
		style = BOM.create('style');
		style.type = 'text/css';
		style.appendChild(BOM.text(css));
		document.head.appendChild(style);
	}
	var component = {name: name, style: css ? style : false, view: div, load: load, _source: source};
	components[name] = component;
	var targets = BOM.find('[data-component="' + name + '"]');
	targets.forEach(element => BOM.insertComponent(component, element));
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
	for (var i = 0; i < data_waiting_for_components.length; i++) {
		if (data_waiting_for_components[i].target_element === target_element) {
			return data_waiting_for_components[i].data;
		}
	}
	return null;
}

function removeDataForElement(target_element) {
	for (var i = 0; i < data_waiting_for_components.length; i++) {
		if (data_waiting_for_components[i].target_element === target_element) {
			delete data_waiting_for_components[i].data;
		}
	}
}

function loadAvailableComponents(element, data) {
	BOM.findWithin(element || document.body, '[data-component]').forEach(target => {
		if (!target.matches('[data-component-uuid]')) {
			var name = target.getAttribute('data-component');
			BOM.insertComponent(name, target, data);
		}
	});
}

/**
	BOM.insertComponent(component, element, data);	// insert a component by name
		// if no element is provided, the component will be appended to document.body
		// data will be passed to the component's load method
*/
// TODO
// - component remove method that removes the view_controller instance as well
// - garbage collection of view_controllers (utilizing the root_element property)
// - support remove handlers, also allow the garbage collection to trigger them
BOM.insertComponent = function (component, element, data) {
	if (typeof component === 'string') {
		if(!components[component]) {
			console.warn('component not available: ', name);
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
	removeDataForElement(element);
	if (!element) {
		element = BOM.create('div');
		document.body.appendChild(element);
	}
	var children = BOM.fragment();
	var uuid = BOM.uuid();
	BOM.moveChildren(element, children);
	BOM.copyChildren(component.view, element);
	var children_dest = BOM.findOneWithin(element, '[data-children]');
	if (children.firstChild && children_dest) {
		BOM.empty(children_dest);
		BOM.moveChildren(children, children_dest);
	}
	element.setAttribute('data-component-uuid', uuid);
	bindAll(element, data);
	if (component.load) {
		var view_controller = component.load(
			element,
			BOM,
			selector => BOM.findWithin(element, selector),
			selector => BOM.findOneWithin(element, selector),
			data
		);
		if (view_controller) {
			if (!models._BOM_components_) {
				models._BOM_components_ = {};
			}
			view_controller.root_element = element;
			models._BOM_components_[uuid] = view_controller;
		}
	}
};

/**
	BOM.uuid();	// generate compliant and pretty random UUID
*/
BOM.uuid = function (){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
};