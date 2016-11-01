// require.js Copyright (c) 2016 Tonio Loewald
/**
	Simple implementation of CommonJS Require
*/

(function(){
var global = this;
var modules = {};

function define(module_name, source_code) {
	var module = {};
	var factory = new Function('module', source_code);
	factory(module);
	return modules[module_name] = module;
}

global.require = function(module_name) {
	if (!modules[module_name]) {
		var request = new XMLHttpRequest();
		request.open('GET', module_name + '.js', false);
		request.send(null);
		if (request.status === 200) {
			define(module_name, request.responseText);
		} else {
			return {};
		}
	}
	return modules[module_name].exports;
}

global.require.isDefined = function(module_name) {
	return !!modules[module_name];
}

global.require.lazy = function(module_name) {
	return new Promise(function(resolve, reject){
		if(!modules[module_name]) {
			var request = new XMLHttpRequest();
			request.open("GET", module_name + '.js', true);
			request.onload = function (e) {
				if (request.readyState === 4) {
					if (request.status === 200) {
						resolve && resolve(define(module_name, request.responseText).exports);
					} else {
						reject && reject(request);
					}
				}
			};
			request.onerror = function (e) {
				failure(request);
			};
			request.send(null);
		} else {
			setTimeout(() => resolve && resolve(modules[module_name].exports));
		}
	});
}
}());