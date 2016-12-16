// require.js Copyright (c) 2016 Tonio Loewald
/**
	Simple implementation of CommonJS Require
*/

(function(global){
'use strict';
var modules = {};
const noop = () => {};

function define(module_name, source_code) {
	var module = {};
	const path = module_name.split('/');
	const file_name = path.pop();
/* jshint evil:true */
	var factory = new Function('module', 'require', source_code + `\n//# sourceURL=${module_name}`);
/* jshint evil:false */
	const local_require = module => {
		if(module.substr(0,2) === './') {
			module = path.join('/') + module.substr(1);
		} else if (module.substr(0,3) === '../') {
			path.pop()
			module = path.join('/') + module.substr(2);
		}
		return require(module)
	};
	local_require.lazy = lazy;
	factory(module, local_require);
	modules[module_name] = module;
	return module;
}

function _require(module_name) {
	if (!modules[module_name]) {
		var request = new XMLHttpRequest();
		request.open('GET', module_name, false);
		request.send(null);
		if (request.status === 200) {
			define(module_name, request.responseText);
		} else {
			return {};
		}
	}
	return modules[module_name].exports;
};

global.require = _require;

global.require.isDefined = function(module_name) {
	return !!modules[module_name];
};

function lazy(module_name) {
	return new Promise(function(resolve, reject){
		if(!modules[module_name]) {
			var request = new XMLHttpRequest();
			request.open("GET", module_name + '.js', true);
			request.onload = function (data) {
				if (request.readyState === 4) {
					if (request.status === 200) {
						(resolve || noop)(define(module_name, request.responseText).exports);
					} else {
						(reject || noop)(request, data);
					}
				}
			};
			request.onerror = function (data) {
				(reject || noop)(request, data);
			};
			request.send(null);
		} else {
			setTimeout(() => resolve && resolve(modules[module_name].exports));
		}
	});
};

global.__d = define;
global.require.lazy = lazy;

}(this));