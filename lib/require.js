/**
# Require
Copyright ©2016-2017 Tonio Loewald

Simple implementation of CommonJS *require*.

Usage:

    const module = require('path/to/module.js');

Relative paths are supported within a file, so, assuming we're inside
`path/to/module.js` and `another_module.js` is also in `path/to/`:

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

## Quick and Dirty Async Delivery

Naive use of require will result in console spam about how
synchronous XHR requests are bad. Rather than using a compile phase
to avoid them, you can do this in the console:

    require.preloadData();

This will produce an array of data (in essence the inferred dependency
graph unspooled as "waves" of modules that can be loaded asynchronously
in order to get everything asynchronously loaded in parallel) which you
can pass to:

    require.preload([ ... ]).then(() => {
      // write the code you would have written before,
      // everything will have loaded asynchronously!
    });

> ### Room for Improvement
>
> `preload` loads each "wave" of dependencies as a set of promises and
> waits for the entire wave to load before proceeding. A finer-grained
> approach would make the tree of promises finer-grained (so a module
> with no dependencies that can be loaded early doesn't slow down
> modules waiting for other modules)
>
> Right now, nothing I'm working on has noticeable performance issues
> w.r.t. loading to optimizing this further is not a priority.

### That was boring, let's do this all automatically!

    require.autoPreload().then(() => {
      // write the code you would have written before,
      // everything will have loaded asynchronously after the first time!
    });

The first time this runs you'll see all the sync loading warnings, and then
it just goes away. Sometimes a code change will cause the preload data to
be automatically updated. Now, this isn't quite as good as working perfectly the
first time, which would require doing this on the server. It would be pretty
easy to integrate this with your devops workflow if it came to that.

    require.autoPreload(10000).then(...); // you can change the throttle delay

Note that the storing of preloadData is throttled because calculating dependencies
could get expensive for sufficiently complex projects. It defaults to 2000ms which
should be fine for anything but truly byzantine sites. It takes < 1ms on a reasonably
modern device for the b8r demo page, but if I recall correctly calculating the
dependencies is O(n^2).
*/
/* global console */

(function(global) {
  'use strict';
  var modules = {};
  const noop = () => {};
  const dependency_map = {};
  const modules_loaded_synchronously = [];
  const require_utils = {};
  var autoPreload_enabled = 0; // also used to throttle saving of preload data

  function define(module_name, source_code) {
    var module = {};
    const path = module_name.split('/');
    path.pop();
    /* jshint evil:true */
    var factory = new Function(
        'module', 'require', source_code + `\n//# sourceURL=${module_name}`);
    /* jshint evil:false */
    const local_require = _relative(path, module_name);
    local_require.lazy = _lazy;
    local_require.viaTag = _viaTag;
    factory(module, local_require);
    modules[module_name] = module;
    return module;
  }

  function _relative(path, module_name) {
    let path_string;
    if (typeof path === 'string') {
      path_string = path;
      path = path.split('/');
    } else if (Array.isArray(path)) {
      path_string = path.join('/');
    } else {
      console.error('_relative require needs a path!');
      debugger;
    }
    const _r = module => {
      if (module.substr(0, 2) === './') {
        module = path.join('/') + module.substr(1);
      } else if (module.substr(0, 3) === '../') {
        const _path = path.slice(0);
        while (module.substr(0, 3) === '../') {
          _path.pop();
          module = module.substr(3);
        }
        module = _path.length ? _path.join('/') + '/' + module : module;
      }
      // map dependencies
      if (module_name) {
        if (!dependency_map[module_name]) {
          dependency_map[module_name] = [];
        }
        if (dependency_map[module_name].indexOf(module) === -1) {
          dependency_map[module_name].push(module);
        }
      }
      return _require(module);
    };

    _r._path = path_string;
    Object.assign(_r, require_utils);

    return _r;
  }

  function _require(module_name) {
    if (!modules[module_name]) {
      var request = new XMLHttpRequest();
      modules_loaded_synchronously.push(module_name);
      console.warn(module_name, 'was loaded synchronously');
      if (autoPreload_enabled) {
        _savePreloadData();
      }
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
      }).catch(() => console.error(`${script_path} failed to load`));
    }
    return scriptTags[script_path];
  };

  var savePreloadDataTimeout = 0;
  const _savePreloadData = () => {
    if (savePreloadDataTimeout) {
      clearTimeout(savePreloadDataTimeout);
    }
    savePreloadDataTimeout = setTimeout(() => {
      console.time('savePreloadData');
      localStorage.setItem(`_require_preloadData_${window.location.pathname}`, _preloadData(false));
      console.timeEnd('savePreloadData');
    }, autoPreload_enabled);
  };

  const _preloadData = prettify => {
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

    return JSON.stringify(waves, false, prettify ? 2 : false);
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

  const _autoPreload = (save_preload_data_throttle_ms) => {
    autoPreload_enabled = save_preload_data_throttle_ms || 2000;
    return new Promise(resolve => {
      const waves = localStorage.getItem(`_require_preloadData_${window.location.pathname}`);
      if (waves) {
        console.log('autoPreload data found');
        _preload(JSON.parse(waves)).then(resolve);
      } else {
        console.warn('no preload data found');
        resolve();
      }
    });
  };

  global.__d = define;

  Object.assign(require_utils, {
    report() {
      console.table(modules_loaded_synchronously);
    },
    data () {
      return {
        modules: Object.keys(modules),
        modules_loaded_synchronously,
        dependency_map
      };
    },
    relative: _relative,
    preloadData: _preloadData,
    preload: _preload,
    autoPreload: _autoPreload,
    lazy: _lazy,
    viaTag: _viaTag,
    modules: () => modules,
  });

  global.require = _require;
  Object.assign(global.require, require_utils);
}(this));
