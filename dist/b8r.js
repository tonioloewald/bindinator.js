(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
  # Ajax Methods

  ajax(url, method, data).then(success, failure)
  json(url, method, data).then(success, failure)
  jsonp(url, method, data).then(success, failure)
*/

(function(module){

module.exports = {
  ajax (url, method, request_data, config) {
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
            case 0:
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
  },

  json (url, method, request_data, config) {
    return new Promise(function(resolve, reject) {
      b8r.ajax(url, method, request_data, config).then(data => {
        try {
          resolve(JSON.parse(data || 'null'));
        } catch(e) {
          console.error('Failed to parse data', data, e);
        }
      }, reject);
    });
  },

  jsonp (url, method, request_data, config) {
    return new Promise(function(resolve, reject) {
      b8r.ajax(url, method, request_data, config).then(data => {
        try {
          resolve(JSON.parse(data || 'null'));
        } catch(e) {
          console.error('Failed to parse data', data, e);
        }
      }, reject);
    });
  },
}

}(module));
},{}],2:[function(require,module,exports){
// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
	# Object Path Methods
	
	getByPath(obj, path) -- obtains a value inside an object by a path, e.g.
	getByPath(obj, "foo.bar") is the equivalent of obj.foo.bar
	if path is not set or is set to '/' then obj is returned.

	setByPath(obj, path, value) -- sets a value inside an object by a path,
	e.g. setByPath(obj, "foo.bar", 17) is the equivalent of obj.foo.bar = 17.

	Paths include support for array dereferencing: "foo.bar[2]" will work as expected.
*/
(function(module){

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
		obj[parseInt(path[0], 10)] = matchTypes(val, obj[parseInt(path[0], 10)]);
	} else {
		obj[path[0]] = matchTypes(val, obj[path[0]]);
	}
}

function matchTypes(value, oldValue, info) {
	if(typeof value === typeof oldValue) {
		return value;
	} else if (typeof value === 'string' && typeof oldValue === 'number') {
		return parseFloat(value);
	} else if (typeof oldValue === 'string') {
		return value + '';
	} else if (typeof oldBalue === 'boolean') {
		return value === 'false' || !!value; // maps undefined || null || '' || 0 => false
	} else if (oldValue !== undefined && oldValue !== null) {
		console.warn('setByPath found non-matching types');
		return value;
	} else {
		return value;
	}
}

module.exports = {getByPath, setByPath};

}(module));
},{}],3:[function(require,module,exports){
/**
  # DOM Methods

  find(selector);                         // syntax sugar for querySelectorAll, returns proper array
  findOne(selector);                      // syntax sugar for querySelector
  findWithin(element, selector);          // find scoped within element
  findWithin(element, selector, true);    // find scoped within element, including the element itself
  findOneWithin(element, selector);       // findOne scoped within element
  findOneWithin(element, selector, true); // findOne scoped within element, including the element itself
  makeArray(arrayish);                    // creates a proper array from something array-like
  succeeding(element, selector);          // next succeeding sibling matching selector
  id(id_string);                          // => document.getElementById(id_string)
  text(textContent)                       // => document.createTextNode(textContent)
  fragment()                              // => document.createDocumentFragment();
  create(type)                            // => document.createElement(type);
  empty(element);                         // removes contents of element
  copyChildren(source, dest);             // copies contents of source to dest
  moveChildren(source, dest);             // moves contents of source to dest
*/
(function(module){

// TODO
// Debug versions of findOne should throw if not exactly one match
module.exports = {
  find: selector => b8r.makeArray(document.querySelectorAll(selector)),
  findOne: document.querySelector.bind(document),
  findWithin: (element, selector, include_self) => {
    var list = b8r.makeArray(element.querySelectorAll(selector));
    if (include_self && element.matches('[data-bind]')) {
      list.unshift(element);
    }
    return list;
  },
  findOneWithin: (element, selector, include_self) => include_self && element.matches(selector) ? element : element.querySelector(selector),
  makeArray: arrayish => [].slice.apply(arrayish),
  succeeding: (element, selector) => {
    while(element.nextSibling && !element.nextElementSibling.matches(selector)){
      element = element.nextElementSibling;
    }
    return element.nextElementSibling;
  },
  findAbove: (elt, selector, until_elt) => {
    var current_elt = elt.parentElement;
    var found = [];
    while(until_elt && current_elt) {
      if (current_elt === document.body) {
        break;
      }
      if (typeof until_elt === 'string' && current_elt.matches(until_elt)) {
        break;
      } else if (current_elt === until_elt) {
        break;
      }
      if(current_elt.matches(selector)) {
        found.push(current_elt);
      }
      current_elt = current_elt.parentElement;
    }
    return found;
  },
  id: document.getElementById.bind(document),
  text: document.createTextNode.bind(document),
  fragment: document.createDocumentFragment.bind(document),
  create: document.createElement.bind(document),
  empty (element) {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
  },
  moveChildren (source, dest) {
    while (source.firstChild) {
      dest.appendChild(source.firstChild);
    }
  },
  copyChildren (source, dest) {
    var element = source.firstChild;
    while (element) {
      dest.appendChild(element.cloneNode(true));
      element = element.nextSibling;
    }
  },
};

}(module));
},{}],4:[function(require,module,exports){
// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
	# fromTargets

	### collecting data from the DOM

	* value -- pulls the element's value from the DOM
	* checked -- pulls the element's checked value from the DOM
	* text -- pulls the element's textContent from the DOM
*/
(function(module){

module.exports = {
	value: function(element){
		return element.value;
	},
	checked: function(element) {
		return element.checked;
	},
	text: function(element){
		return element.textContent;
	},
	fromMethod: function(element, path) {
		var [model, ...method] = path.split('.');
		method = method.join('.');
		return b8r.getByPath(model, method)(element);
	}
};

}(module));
},{}],5:[function(require,module,exports){
// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
#bindinator

Binds your data and methods so you can concentrate on your actual goals.
*/
/* jshint esnext:true, loopfunc:true */
/* globals console, window */

(function(module){
'use strict';

const {getByPath, setByPath} = require('./b8r.byPath.js');

function b8r(){}

module.exports = b8r;

const dom = require('./b8r.dom.js');
Object.assign(b8r, dom);

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
	b8r.register(name, obj);						// register an object by name as data or controller
		// the names _DATA_ and _b8r_ are reserved; other similar namess may be reserved later
		// binding to _DATA_ explicitly means you will only be bound to an explicit object
		// _b8r_ is the name of the internal event handlers for bound variables
	b8r.deregister(name);								// remove a registered object
	b8r.setByPath(name, path, value);		// set a registered object's property by path
	b8r.getByPath(name, path);					// get a registered object's property by path
*/

b8r.register = function (name, obj) {
	if (name.match(/^_[^_]*_$/)) {
		throw "cannot register object as " + name + ", all names starting and ending with a single '_' are reserved.";
	}
	models[name] = obj;
	if (b8r.getByPath(models[name], 'add')) {
		models[name].add();
	}
	b8r.find('[data-list*="' + name + '"]').forEach(elt => {
		bindList(elt);
		b8r.trigger('change', elt);
	});
	b8r.find('[data-bind*="' + name + '"]').forEach(elt => {
		bind(elt);
		b8r.trigger('change', elt);
	});
	playSavedMessages(name);
};

b8r.models = () => Object.keys(models);

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
	for (var name in models) {
		if (name.substr(0,2) === 'c#' && instances.indexOf(name) === -1) {
			(models[name].remove || noop)();
			delete(models[name]);
		}
	}
};

b8r.touchByPath = function(name, path, source_element) {
	if (Array.isArray(b8r.getByPath(name, path))) {
		const lists = b8r.makeArray(document.querySelectorAll('[data-list*="' + name + '.' + path + '"]'));
		lists.forEach(element => element !== source_element && bindList(element));
	} else {
		const elements = b8r.makeArray(document.querySelectorAll('[data-bind*="' + name + '.' + path + '"]'));
		elements.forEach(element => element !== source_element && bind(element));
	}
};

b8r.setByPath = function (name, path, value, source_element) {
	if (models[name]) {
		setByPath(models[name], path, value);
		// this may update some false positives, but very few
		b8r.touchByPath(name, path, source_element);
	}
};

b8r.getByPath = function (name, path) {
	if (name && models[name]) {
		return getByPath(models[name], path || '/');
	}
};

b8r.getInstance = function(element) {
	const ref = element.closest('[data-list-instance]').getAttribute('data-list-instance');
	const [model, ...pathParts] = ref.split('.');
	return b8r.getByPath(model, pathParts.join('.'));
};

/**
	b8r.on(element, event_type, model_name, method_name) // creates an implicit event-binding data attribute
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

b8r.on = function (element, event_type, object, method) {
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
		existing.push(handler);
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
	b8r.onAny(event_type, object, method) => handlerRef // creates an event handler that will get first access to any event
		// returns a reference for purposes of removal
	b8r.offAny(handlerRef,...) // removes all the handlerRefs passed

	Note that this works *exactly* like an invisible element in front of everything else
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
		source = source.split(';').filter(elt => !!elt);
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
	b8r.callMethod(model, method, evt);	// Call a method by name from a registered method
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
			saved_messages.splice(i,1);
		}
	}
	while (playbackQueue.length) {
		var {model, method, evt} = playbackQueue.pop();
		b8r.callMethod(model, method, evt);
	}
}

b8r.callMethod = function (model, method, evt) {
	var result = null;
	if ( models[model] ) {
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
	b8r.trigger(type, target); // trigger a synthetic implicit (only!) event
*/
b8r.trigger = function(type, target) {
	if (target) {
		var stopPropagation = () => {};
		var preventDefault = () => {};
		handleEvent({type, target, stopPropagation, preventDefault});	
	} else {
		debugger;
		console.warn('b8r.trigger called with no specified target');
	}
};

/**
	## Keystrokes

	b8r leverages the modern browser's event "code" to identify keystrokes,
	and uses a normalized representation of modifier keys (in alphabetical)
	order.

	* __alt__ represents the alt or option keys
	* __ctrl__ represents the control key
	* __meta__ represents the windows, command, or meta keys
	* __shift__ represents the shift keys

	b8r.keystroke(event) // returns normalized keystroke representation
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
						result = b8r.callMethod(handler.model, handler.method, evt);
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
	## data-bind
*/

const toTargets = require('./b8r.toTargets.js');
const fromTargets = require('./b8r.fromTargets.js');

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
			b8r.on(element, ['change', 'input'], '_b8r_', 'update');
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
	var list = data ? getByPath(data, path) : b8r.getByPath(model, path);
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
	b8r.show(element);
	for (var i = 0; i < list.length; i++) {
		var instance = element.cloneNode(true);
		instance.removeAttribute('data-list');
		const itemPath = list_path + '[' + i + ']';
		instance.setAttribute('data-list-instance', itemPath);
		bindAll(instance, list[i], itemPath);
		element.parentElement.insertBefore(instance, element);
	}
	b8r.hide(element);
}

function bindAll(element, data, basePath) {
	// consider passing data and basePath here...
	loadAvailableComponents(element, data);
	findBindables(element).forEach(elt => bind(elt, data, basePath));
	findLists(element).forEach(elt => bindList(elt, data, basePath));
	b8r.trigger('change', element);
}

b8r.bindAll = bindAll;

models._b8r_ = {
	echo: evt => { console.log(evt); return true; },
	stopEvent: () => {},
	update: function(evt) {
		var bindings = getBindings(evt.target);
		for (var i = 0; i < bindings.length; i++) {
			var {targets, model, path} = bindings[i];
			targets = targets.filter(t => fromTargets[t.target]);
			targets.forEach(t => {
				b8r.setByPath(model, path, fromTargets[t.target](evt.target, t.key), evt.target);
			});
		}
		return true;
	},
};

const ajax = require('./b8r.ajax.js');
Object.assign(b8r, ajax);

const components = {};

/**
	b8r.component(name, url); // loads component from url
	  // registers it as "name"
	  // the extension .component.html is appended to url
	  // component will automatically be inserted as expected once loaded
	  // resolve will be passed the loaded component
	b8r.component(url); // as per above, name is used as url
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
	var load = script ? new Function('component', 'b8r', 'find', 'findOne', 'data', 'register', 'get', 'set', script) : false;
/*jshint evil: false */
	var style;
	if (css) {
		style = b8r.create('style');
		style.type = 'text/css';
		style.appendChild(b8r.text(css));
		document.head.appendChild(style);
	}
	var component = {name: name, style: css ? style : false, view: div, load: load, _source: source};
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
	b8r.findWithin(element || document.body, '[data-component]').forEach(target => {
		if (!target.matches('[data-component-id]')) {
			var name = target.getAttribute('data-component');
			b8r.insertComponent(name, target, data);
		}
	});
}

/**
	b8r.insertComponent(component, element, data);	// insert a component by name
		// if no element is provided, the component will be appended to document.body
		// data will be passed to the component's load method
*/
// TODO
// - component remove method that removes the view_controller instance as well
// - garbage collection of view_controllers (utilizing the root_element property)
// - support remove handlers, also allow the garbage collection to trigger them
var component_count = 0;
b8r.insertComponent = function (component, element, data) {
	if (!element) {
		element = b8r.create('div');
	}
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
		if (data) {
			removeDataForElement(element);
		}
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
					elt.setAttribute(attr, val.replace(/_component_/g, component_id));
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
	if (component.load) {
		const register = data => b8r.register(component_id, data);
		const get = path => b8r.getByPath(component_id, path);
		const set = (path, value) => b8r.setByPath(component_id, path, value);
		if (data) register(data);
		var view_obj = component.load(
			element,
			b8r,
			selector => b8r.findWithin(element, selector),
			selector => b8r.findOneWithin(element, selector),
			data,
			register,
			get,
			set
		);
		if (view_obj) {
			console.warn('returning from views is deprecated; please use register() instead');
			b8r.register(component_id, view_obj);
		}
	}
	// it would be nice to eliminate quasi-magical binding to .foo and
	// replace it with concrete binding to _component_.foo, but will this
	// break async nesting?
	bindAll(element, data);
	return element;
};

}(module));

},{"./b8r.ajax.js":1,"./b8r.byPath.js":2,"./b8r.dom.js":3,"./b8r.fromTargets.js":4,"./b8r.toTargets.js":6}],6:[function(require,module,exports){
// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
	# toTargets

	### flushing data to the DOM

	* value -- sets the element's value (works for input, select, textarea)
	* checked -- toggles the element's checked based on truthiness of value
	* text -- sets the element's textContent
	* attr(some_attribute) -- sets the element's specified attribute
	* style -- sets the element's specified style property
	* style(camelcaseProperty) -- sets the specified style attribute
	* style(camelcaseProperty,units) -- sets the specified style attribute, adding the units suffix (e.g. style(borderWidth,px)=.borderWidth)
	* class(class_name) -- toggles the specified class based on the truthiness of value
	* show_if -- shows the (otherwise hidden) element base on the truthiness of the value
	* show_if(value) -- shows the (otherwise hidden) element for matching value
	* method(model.method) -- calls the specified registered method, passing the element, valuem and the data object as parameters
	* component_map(value:component|other_value:other_component|yet_another_component) -- loads and binds the first matching component
	* json -- dumps the value stringified into the textContent of the element (mainly for debugging)

	### Comparison Values

	Used for comparison to certain values in conditional toTargets

	* \_true\_
	* \_false\_
	* \_undefined\_
	* \_null\_
*/
(function(module){

const special_values = {
	'_true_': true,
	'_false_': false,
	'_undefined_': undefined,
	'_null_': null,
};

function equals(value_to_match, value) {
	if (typeof value === 'string') value = value.replace(/\&nbsp;/g, '').trim();
	return special_values.hasOwnProperty(value_to_match) ? 
				 value_to_match === special_values[value] :
				 !!value;
}

module.exports = {
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
	img: function(element, value) {
		element.style.opacity = 0;
		if(!getComputedStyle(element).transition) {
			element.style.transition = '0.25s ease-out';
		}
		if (value) {
			const image = new Image();
			image.src = value;
			element.setAttribute('src', value);
			image.onload = () => element.style.opacity = 1;
		}
	},
	style: function(element, value, dest) {
		if (!dest) {
			if(typeof value === 'string') {
				element.setAttribute('style', dest);
			} else if (typeof value === 'object') {
				Object.assign(element.style, value);
			}
		} else if (value !== undefined) {
			const [prop, units] = (dest + ',').split(',');
			element.style[prop] = value + units;
		}
	},
	class: function(element, value, class_to_toggle) {
		if (class_to_toggle) {
			if (value) {
				element.classList.add(class_to_toggle);
			} else {
				element.classList.remove(class_to_toggle);
			}
		} else {
			element.setAttribute('class', value);
		}
	},
	enabled_if: function(element, value, dest) {
		element.disabled = !equals(dest, value);
	},
	enabled_unless: function(element, value, dest) {
		element.disabled = equals(dest, value);
	},
	show_if: function(element, value, dest) {
		equals(dest, value) ? b8r.show(element) : b8r.hide(element);
	},
	method: function(element, value, dest, data) {
		var [model, ...method] = dest.split('.');
		method = method.join('.');
		b8r.getByPath(model, method)(element, value, data);
	},
	json: function(element, value) {
		element.textContent = JSON.stringify(value, false, 2);
	},
	component: function(element, value, dest) {
		const id = element.getAttribute('data-component-id');
		if (id) {
			if(b8r.models().indexOf(id) > -1) {
				b8r.setByPath(id, dest, value);
			} else {
				console.error('component is not registered but is bound', element);
			}
		} else if (!element.getAttribute('data-component')) {	
			console.error('component toTarget found on non componennt', element);
		}
	},
	component_map: function(element, value, dest, data) {
		if (element.getAttribute('data-component-id')) {
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
			b8r.insertComponent(component_name, element, data);
		}
	}
};

}(module));
},{}],7:[function(require,module,exports){
window.b8r = require('./b8r.js');
},{"./b8r.js":5}]},{},[7]);
