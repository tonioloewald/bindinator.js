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
/* jshint evil:true */
	var factory = new Function('module', source_code);
/* jshint evil:false */
	factory(module);
	modules[module_name] = module;
	return module;
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
};

global.require.isDefined = function(module_name) {
	return !!modules[module_name];
};

global.require.lazy = function(module_name) {
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
}(this));