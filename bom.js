// Bind-O-Matic.js Copyright (c) 2016 Tonio Loewald
/**
#BindOMatic

Binds your data and methods so you can concentrate on your actual goals.
*/

function BOM(){};

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
		element = element.nextElementSibling
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
		throw "cannot register object as " + name + ", all names starting and ending with a single '_' are reserved."
	}
	models[name] = obj;
	if (BOM.getByPath(models[name], 'add')) {
		models[name].add();
	}
	playSavedMessages(name);
	BOM.find('[data-bind*="' + name + '"]').forEach(elt => bind(elt));
	BOM.find('[data-list*="' + name + '"]').forEach(elt => bindList(elt));
	// play back messages
};

BOM.isRegistered = function(name) {
	return models[name] !== undefined;
}

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
		return getByPath(models[name], path);
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
BOM.on = function (element, event_type, object, method) {
	// check if handler already exists
	// var existingHandlers = implicitEventHandlers(element);
	if (!(event_type instanceof Array)) {
		event_type = [event_type];
	}
	var handler = event_type.sort().join(',') + ':' + object + '.' + method;
	var existing = element.getAttribute('data-event');
	if (existing) {
		if (existing.replace(/\s*(^|$|[,:;])\s*/g, '$1').split(';').indexOf(handler) === -1) {
			element.setAttribute('data-event', existing + ';' + handler);
		}
	} else {
		element.setAttribute('data-event', handler);
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

function playSavedMessages(model) {
	var playbackQueue = [];
	for (var i = saved_messages.length - 1; i >= 0; i--) {
		if (saved_messages[i].model === model) {
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
		while(!view_controller && target) {
			var uuid = target.getAttribute('data-component-uuid');
			view_controller = models['_BOM_components_'][uuid];
			target = target.parentElement.closest('[data-component-uuid]');
		}
		if (!view_controller) {
			console.error('event bound to _component_ found no view_controller', evt.target);
		} else {
			result = view_controller[method](evt);	
		}
	} else if( models[model] ) {
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
	var stopPropagation = () => {};
	var preventDefault = () => {};
	handleEvent({type, target, stopPropagation, preventDefault});
}

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
}

function handleEvent (evt) {
	var target = evt.target;
	var keystroke = BOM.keystroke(evt);
	var done = false;
	var result;
	while (target && !done) {
		var handlers = implicitEventHandlers(target);
		for (var i = 0; i < handlers.length; i++) {
			var handler = handlers[i];
			var type_index = handler.types.indexOf(evt.type);
			for (var type_index = 0; type_index < handler.types.length; type_index++) {
				if(
					handler.types[type_index] === evt.type
					&& (!handler.type_args[type_index] || handler.type_args[type_index].indexOf(keystroke) > -1)
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
		target = target.parentElement;
	}
}

var implicit_event_types = [
	'mousedown', 'mouseup', 'click',
	'input', 'change',
	'keydown', 'keyup',
	'focus', // more to follow
];

implicit_event_types.forEach(type => document.body.addEventListener(type, handleEvent));

/*
	This is where we define all the methods for binding to/from the DOM
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
	text: function(element, value){
		element.textContent = value;
	},
	attr: function(element, value, dest) {
		element.setAttribute(dest, value);
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
	// conditional styles
};

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

function toDOM (element, target, obj, path) {
	var [,to,,dest] = target.match(/(\w+)(\((\w+)\))?/);
	if (!to) {
		console.error('bad DOM target', target);
	}
	if (toTargets[to]) {
		toTargets[to](element, getByPath(obj, path), dest);
	} else {
		console.error('unknown data target', target);
	}
}

function fromDOM (element, target) {
	if (fromTargets[target]) {
		return fromTargets[target](element);
	} else {
		console.error('unknown data source target', target);
	}
}

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
	var [, model,, path] = source.match(/([^.;]*)(\.([^.;]+))?/);
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
				toTargets[t.target](element, getByPath(obj, path), t.key)
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
	}
	element.style.display = 'none';
}

BOM.show = function (element) {
	if (element.style.display === 'none') {
		element.style.display = element.getAttribute('data-orig-display') || '';
	}
}

function bindList (element, data, basePath) {
	var list_path = element.getAttribute('data-list');
	try {
		var [,model,, path] = list_path.match(/^([^\.]*)(\.(.*))?$/);
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
		var basePath = list_path + '[' + i + ']';
		instance.setAttribute('data-list-instance', basePath);
		bindAll(instance, list[i], basePath);
		element.parentElement.insertBefore(instance, element);
	}
	BOM.hide(element);
}

function bindAll(element, data, basePath) {
	// consider passing data and basePath here...
	loadAvailableComponents(element, data);
	findBindables(element).forEach(elt => bind(elt, data, basePath));
	findLists(element).forEach(elt => bindList(elt, data, basePath));
}

BOM.bindAll = bindAll;

models['_BOM_'] = {
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
BOM.ajax = function (url, method, request_data, data_type) {
	return new Promise(function(resolve, reject) {
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
		}
		if (typeof request_data === 'object') {
			request_data = JSON.stringify(request_data);
			request.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
		}
		request.send(request_data);
	});
};

BOM.json = function (url, method, request_data) {
	return new Promise(function(resolve, reject) {
		BOM.ajax(url, method, request_data).then(data => {
			try {
				resolve(JSON.parse(data));
			} catch(e) {
				console.error('Failed to parse data', data, e);
			}
		}, reject);
	});
};

BOM.jsonp = function (url, method, request_data) {
	return new Promise(function(resolve, reject) {
		BOM.ajax(url, method, request_data).then(data => {
			try {
				resolve(JSON.parse(data));
			} catch(e) {
				console.error('Failed to parse data', data, e);
			}
		}, reject);
	});
}

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
	var element = source.firstChild;
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
				var css = false;
				var view;
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
				var load = script ? new Function('component', 'BOM', 'find', 'findOne', 'data', script) : false;
				if (css) {
					var style = BOM.create('style');
					style.type = 'text/css';
					style.appendChild(BOM.text(css));
					document.head.appendChild(style);
				}
				var component = {name: name, style: css ? style : false, view: div, load: load};
				var component = {name: name, style: css ? style : false, view: div, load: load, _source: source};
				components[name] = component;
				var targets = BOM.find('[data-component="' + name + '"]');
				targets.forEach(element => BOM.insertComponent(component, element));
				resolve(component);
			});
		}
	});
};

var data_waiting_for_components = []; // { target_element, data }

function saveDataForElement(target_element, data) {
	if (data) {
		removeDataForElement(target_element);
		data_waiting_for_components.push({target_element, data});	
	}
};

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
};

function loadAvailableComponents(element, data) {
	BOM.findWithin(element || document.body, '[data-component]').forEach(target => {
		if (!target.matches('[data-component-uuid]')) {
			var name = target.getAttribute('data-component');
			if (components[name]) {
				BOM.insertComponent(components[name], target, data);
			} else {
				saveDataForElement(target, data);
				console.warn('component not available: ', name);
			}
		}
	})
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
			console.error('could not insert component', component);
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
			if (!models['_BOM_components_']) {
				models['_BOM_components_'] = {};
			}
			view_controller.root_element = element;
			models['_BOM_components_'][uuid] = view_controller;
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
}