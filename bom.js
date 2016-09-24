/**
#BindOMatic

Binds your data and methods so you can concentrate on building new stuff.

	BOM(); // if you like automatic magic
*/
BOM = function(){
	this.load();
	this.bind();
}

/**
	BOM.find();       // syntax sugar for querySelectorAll
*/
BOM.find = document.querySelectorAll.bind(document)

/**
BOM.findOne();        // syntax sugar for querySelector
*/
BOM.findOne = document.querySelector.bind(document);

/**
BOM.id();             // syntax sugar for findElementById
*/
BOM.id = document.getElementById.bind(document);

/**
	BOM.add(model_name, javascript_object); // mount model/controller object
	BOM.remove(model_name); // remove model/controller object
*/
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

BOM.add = function(name, obj) {
	models[name] = obj;
	if (BOM.getByPath(models[name], 'add')) {
		models[name].add();
	}
	BOM.bind('[data-bind*="' + name + '"]')
	// play back messages
};

BOM.remove = function(name) {
	if (BOM.getByPath(models[name], 'remove')) {
		models[name].remove();
	}
	delete(models[name]);
};

BOM.setByPath = function (name, path, value, source_element) {
	if (models[name]) {
		setByPath(models[name], path, value);
		// this may update some false positives, but very few
		var elements = [].slice.apply(document.querySelectorAll('[data-bind*="=' + name + '.' + path + '"]'));
		elements.forEach(element => element !== source_element && bind(element));
	}
}

BOM.getByPath = function (name, path) {
	if (models[name]) {
		return getByPath(models[name], path);
	}
}
/**
	BOM.on(event_type, model_name, method_name) // creates an implicit event-binding data attribute
	data-event="event_type:module_name.method_name" // multiple handlers are semicolon-delimited
*/
BOM.on = function (element, event_type, object, method) {
	// check if handler already exists
	// var existingHandlers = implicitEventHandlers(element);
	if (!event_type instanceof Array) {
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
}

/*
 	returns an array of parsed implicit event handlers for an element
 	data-event="type1:model1.method1;type2,type3:model2.method2" is returned as
 	[
		{ types: ["type1"], model: "model1", method: "method1"},
		{ types: ["type2", "type3"], model: "model2", method: "method2"}
	]
*/
function implicitEventHandlers(element) {
	var source = element.getAttribute('data-event');
	var handlers = [];
	if (source) {
		source = source.split(';');
		handlers = source.map(function(instruction){
			var [type, handler] = instruction.split(':');
			var [model, method] = handler.trim().split('.');
			return { types: type.split(',').map(s => s.trim()).sort(), model, method };
		});
	}
	return handlers;
}

BOM.callMethod = function (model, method, evt) {
	var result = null;
	if( models[model] ) {
		result = models[model][method](evt);
	} else {
		// TODO queue if model not available
		// event is stopped from further propagation
		// provide global wrappers that can e.g. put up a spinner then call the method
		result = false;
	}
	return result;
}

function handleEvent(evt) {
	var target = evt.target;
	var done = false;
	var result;
	while (target && !done) {
		var handlers = implicitEventHandlers(target);
		for (var i = 0; i < handlers.length; i++) {
			if (handlers[i].types.indexOf(evt.type) > -1) {
				var handler = handlers[i];
				result = BOM.callMethod(handler.model, handler.method, evt);
			}
		}
		// use stopPropagation?!
		if (result === false) {
			break;
		}
		target = target.parentElement;
	}
}

var implicit_event_types = [
	'mousedown', 'mouseup', 'click',
	'input', 'change',
	'focus', // more to follow
];

implicit_event_types.forEach(type => document.body.addEventListener(type, handleEvent));

/**
	BOM.bind();           // bind all intrinsic data
	BOM.bind(element);    // bind all intrinsic data within element
	BOM.bind(model);	  // bind all elements matching
*/

BOM.bind = function(element) {
	var bind_list;
	if (typeof element === 'string') {
		bind_list = [].slice.apply(document.querySelectorAll(element));
	} else if (element instanceof HTMLElement) {
		bind_list = [element];
	} else {
		bind_list = document.querySelectorAll('[data-bind]');
	}
	for (var i = 0; i < bind_list.length; i++) {
		bind(bind_list[i]);
	}
}

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
}

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
}

function toDOM(element, target, obj, path) {
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

function fromDOM(element, target) {
	if (fromTargets[target]) {
		return fromTargets[target](element);
	} else {
		console.error('unknown data source target', target);
	}
}

function parseBinding(binding) {
	var [targets, source] = binding.split('=');
	targets = targets.split(',').map(function(target){ 
		var parts = target.match(/(\w+)(\((\w+)\))?/);
		if(!parts) {
			console.error('bad target', target, 'in binding', binding);
			return;
		}
		return parts ? { target: parts[1], key: parts[3] } : null;
	});
	var [, model, path] = source.match(/(\w+)\.([^;]+)/);
	return {targets, model, path};
}

function getBindings(element) {
	return element.getAttribute('data-bind').split(';').map(parseBinding);
}

function bind (element) {
	var bindings = getBindings(element);
	for (var i = 0; i < bindings.length; i++) {
		var {targets, model, path} = bindings[i];
		var obj = models[model];
		var _toTargets = targets.filter(t => toTargets[t.target]);
		var _fromTargets = targets.filter(t => fromTargets[t.target]);
		if (models[model] && _toTargets.length) {
			_toTargets.forEach(t => {
				toTargets[t.target](element, BOM.getByPath(model, path), t.key)
			});
		} else {
			// save message for when it mounts
		}
		if (_fromTargets.length) {
			BOM.on(element, ['change', 'input'], '_BOM_', 'update');
		}
	}
}

BOM.add('_BOM_', {
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
});
/**
	BOM.ajax(url, method, data).then(success, failure)
	BOM.json(url, method, data).then(success, failure)
	BOM.load();           // load all intrinsic components
	BOM.load(element);    // load intrinsic components within element
	BOM.load(element, url); // load intrinsic component at url into element
	BOM.unload(element);  // unload component (tell it first, cancellable)
*/

BOM.ajax = function(url, method, data) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();
		request.open(method, url, true);
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
		var request_data = data;
		if (typeof data !== 'string') {
			request_data = data ? JSON.stringify(data) : null;
		}
		request.send(request_data);
	});
}

BOM.json = function(url, method, data) {
	return new Promise(function(resolve, reject) {
		BOM.ajax(url, method, data).then(data => resolve(JSON.parse(data)), reject);
	});
}
