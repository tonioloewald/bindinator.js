/**
# Require
Copyright ©2016-2017 Tonio Loewald

Simple implementation of CommonJS Require

Usage:

    const module = require('path/to/module.js');

Relative paths are supported within a file, so:

    // another_module is also in path/to/
    const another_module = require('./another_module.js');

If you don't want synchronous requires (and, you don't):

    require.lazy('path/to/module.js').then(module => {
      // you're good to go!
    });

And finally, if you need to use some primordial library that wants
to be global:

    require.viaTag('path/to/babylon.min.js').then(() => {
      const engine = new BABYLON.Engine(canvas, true);
      ...
    });

Naive use of require will result in console spam about how
synchronous XHR requests are the devil. If you get them you can do
this in the console:

    require.preloadData();

This will give you an array of data which you can pass to:

    require.preload([ ... ]).then(() => {
      // write the code you would have written before,
      // everything will have loaded asynchronously!
    });

Right now, preloadData() tries to load everything in parallel
as quickly as it can (modulo dependencies), meaning that big modules
with no dependencies can be a bottleneck. If this every becomes a problem
for me (including if I get bothered by enough people), I will drill down and
try to even out the preload "waves".
*/
/* global console */

(function(global) {
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
    var factory = new Function(
        'module', 'require', source_code + `\n//# sourceURL=${module_name}`);
    /* jshint evil:false */
    const local_require = module => {
      if (module.substr(0, 2) === './') {
        module = path.join('/') + module.substr(1);
      } else if (module.substr(0, 3) === '../') {
        path.pop();
        module = path.join('/') + module.substr(2);
      }
      if (!dependency_map[module_name]) {
        dependency_map[module_name] = [];
      }
      if (dependency_map[module_name].indexOf(module) === -1) {
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
    return new Promise(function(resolve, reject) {
      if (!modules[module_name]) {
        var request = new XMLHttpRequest();
        request.open('GET', module_name, true);
        request.onload = function(data) {
          if (request.readyState === 4) {
            if (request.status === 200) {
              (resolve ||
               noop)(define(module_name, request.responseText).exports);
            } else {
              (reject || noop)(request, data);
            }
          }
        };
        request.onerror = function(data) {
          (reject || noop)(request, data);
        };
        request.send(null);
      } else {
        setTimeout(() => resolve && resolve(modules[module_name].exports));
      }
    });
  };

  const scriptTags = {};
  const _viaTag = script_path => {
    if(!scriptTags[script_path]) {
      scriptTags[script_path] = new Promise((resolve) => {
        const script = document.createElement('script');
        script.setAttribute('src', script_path);
        script.addEventListener('load', resolve);
        document.body.appendChild(script);
      });
    }
    return scriptTags[script_path];
  };

  const _preloadData = () => {
    let available = [];
    let module_list = Object.keys(modules);
    const not_available = module => available.indexOf(module) === -1;

    // note that this is O(n^2) so if you have many, many modules it could get
    // slow (but it should never be run by user)
    const no_deps = module => !dependency_map[module] ||
        dependency_map[module].filter(not_available).length === 0;
    const waves = [];
    while (module_list.filter(not_available).length) {
      let wave = module_list.filter(not_available).filter(no_deps);
      waves.push(wave);
      if (wave.length === 0) {
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
        return Promise.all(wave.map(_lazy))
            .then(() => waves.length ? preload(waves) : null);
      }
    }
    return preload(waves);
  };

  global.__d = define;
  global.require.report = () => {
    console.table(modules_loaded_synchronously);
  };
  global.require.data = () => {
    return {
      modules: Object.keys(modules),
      modules_loaded_synchronously,
      dependency_map
    };
  };
  global.require.preloadData = _preloadData;
  global.require.preload = _preload;
  global.require.lazy = _lazy;
  global.require.viaTag = _viaTag;
  global.require.modules = () => modules;

}(this));
