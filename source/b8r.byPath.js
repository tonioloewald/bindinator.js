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
/* global module, console */
(function(module){

'use strict';

function pathParts(path) {
  if (!path || path === '/') {
    return [];
  }

  if (Array.isArray(path)) {
    return path;
  } else {
    const parts = [];
    while (path.length) {
      var index = path.search(/\[[^\]]+\]/);
      if(index === -1) {
        parts.push(path.split('.'));
        break;
      } else {
        const part = path.substr(0, index);
        path = path.substr(index);
        if (part) {
          parts.push(part.split('.'));
        }
        index = path.indexOf(']') + 1;
        parts.push(path.substr(1, index - 2));
        // handle paths dereferencing array element like foo[0].id
        if (path.substr(index, 1) === '.') {
          index += 1;
        }
        path = path.substr(index);
      }
    }
    return parts;
  }
}

function getByPath(obj, path) {
  const parts = pathParts(path);
  var found = obj;
  var i, max_i, j, max_j;
  for(i = 0, max_i = parts.length; found && i < max_i; i++) {
    var part = parts[i];
    if (Array.isArray(part)) {
      for(j = 0, max_j = part.length; found && j < max_j; j++) {
        var key = part[j];
        found = found[key];
      }
    } else {
      if (!found.length) {
        found = undefined;
      } else if (path.indexOf('=') > -1) {
        const [path, value] = part.split('=');
        const list = found;
        found = undefined;
        for(j = 0, max_j = list.length; j < max_j; j++) {
          const item = list[j];
          if (getByPath(item, path) + '' == value) {
            found = item;
            break;
          }
        }
      } else {
        j = parseInt(part, 10);
        found = found[j];
      }
    }
  }
  return found === undefined ? null : found;
}

function setByPath(obj, path, val) {
  const parts = pathParts(path);

  while(obj && parts.length) {
    const part = parts.shift();
    if (typeof part === 'string') {
      if (!Array.isArray(obj)) {
        console.error('setByPath failed: expected array, found', obj);
        throw 'setByPath failed: expected array';
      }
      if (part.indexOf('=') > -1) {
        const [key_path, key_value] = part.split('=');
        obj = obj.filter(item => getByPath(item, key_path) + '' == key_value)[0]; // jshint ignore:line
        if (!parts.length) {
          if (typeof obj === 'object') {
            Object.assign(obj, val);
            return true;
          } else {
            console.error('setByPath failed): expected object, found', obj);
            throw 'setByPath failed: expected object';
          }
        }
      } else {
        const idx = parseInt(part, 10);
        if (parts.length) {
          obj = obj[idx];
        } else {
          obj[idx] = matchTypes(val, obj[idx]);
          return true;
        }
      }
    } else if (Array.isArray(part) && part.length) {
      while(part.length) {
        var key = part.shift();
        if (part.length || parts.length) {
          if (!obj[key]) {
            obj[key] = {};
          }
          obj = obj[key];
        } else {
          obj[key] = matchTypes(val, obj[key]);
          return true;
        }
      }
    } else {
      console.error('setByPath failed: bad path', path);
      throw 'setByPath failed';
    }
  }
  throw 'setByPath failed';
}

function matchTypes(value, oldValue) {
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

module.exports = {getByPath, setByPath, matchTypes, pathParts};

}(module));