/**
# Require
Copyright ©2016-2017 Tonio Loewald

Simple implementation of CommonJS Require
*/
/* global console */

(function(global){
'use strict';
var modules = {};
const noop = () => {};
const dependency_map = {};
const modules_loaded_synchronously = [];

function define(module_name, source_code) {
	var module = {};
	const path = module_name.split('/');
	path.pop();
/* jshint evil:true */
	var factory = new Function('module', 'require', source_code + `\n//# sourceURL=${module_name}`);
/* jshint evil:false */
	const local_require = module => {
		if(module.substr(0,2) === './') {
			module = path.join('/') + module.substr(1);
		} else if (module.substr(0,3) === '../') {
			path.pop();
			module = path.join('/') + module.substr(2);
		}
		if(!dependency_map[module_name]) {
			dependency_map[module_name] = [];
		}
		if(dependency_map[module_name].indexOf(module) === -1) {
			dependency_map[module_name].push(module);
		}
		return global.require(module);
	};
	local_require.lazy = _lazy;
	factory(module, local_require);
	modules[module_name] = module;
	return module;
}

function _require(module_name) {
	if (!modules[module_name]) {
		var request = new XMLHttpRequest();
		modules_loaded_synchronously.push(module_name);
		console.warn(module_name, 'was loaded synchronously');
		request.open('GET', module_name, false);
		request.send(null);
		if (request.status === 200) {
			define(module_name, request.responseText);
		} else {
			console.error('could not load required module', module_name);
			return {};
		}
	}
	return modules[module_name].exports;
}

global.require = _require;

global.require.isDefined = function(module_name) {
	return !!modules[module_name];
};

const _lazy = module_name => {
	return new Promise(function(resolve, reject){
		if(!modules[module_name]) {
			var request = new XMLHttpRequest();
			request.open("GET", module_name, true);
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

const _preloadData = () => {
  let available = [];
  let module_list = Object.keys(modules);
  const not_available = module => available.indexOf(module) === -1;

  // note that this is O(n^2) so if you have many, many modules it could get slow (but it should never be run by user)
  const no_deps = module => !dependency_map[module] || dependency_map[module].filter(not_available).length === 0;
  const waves = [];
  while(module_list.filter(not_available).length) {
    let wave = module_list.filter(not_available).filter(no_deps);
    waves.push(wave);
    if(wave.length === 0) {
      console.error('dependency deadlock');
      break;
    }
    available = available.concat(wave);
  }

  return JSON.stringify(waves, false, 2);
};

const _preload = waves => {
  function preload(waves) {
    if (waves.length) {
  		const wave = waves.length ? waves.shift() : [];
      return Promise.all(wave.map(_lazy)).then(() => waves.length ? preload(waves) : null);
    }
  }
  return preload(waves);
};

global.__d = define;
global.require.report = () => { console.table(modules_loaded_synchronously); };
global.require.data = () => { return {modules: Object.keys(modules), modules_loaded_synchronously, dependency_map}; };
global.require.preloadData = _preloadData;
global.require.preload = _preload;
global.require.lazy = _lazy;
global.require.modules = () => modules;

}(this));
