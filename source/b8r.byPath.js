// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
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