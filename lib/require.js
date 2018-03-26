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
graph unspooled as "waves" of modules that can be loaded asynchronously)
which you can pass to:

    require.preload([ ... ]).then(() => {
      // write the code you would have written before,
      // everything will have loaded asynchronously!
    });

E.g. if module A requires modules B, and C, and module B requires modules
D, and E you might get something like this:

    [
      [C, D, E], // modules with no dependencies
      [B],       // B depends on D and E, already loaded
      [A]        // A relies on B, and C, already loaded
    ]

> ### Room for Improvement
>
> In the preceding example, module C did not need to load in the first
> wave, and could have been loaded in the second wave.
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
should be fine for anything but truly byzantine apps. It takes < 1ms on a reasonably
modern device for the b8r demo page, but if I recall correctly calculating the
dependencies is O(n^2).

### Compatibility Hack

It seems that some implementations of require pass module.exports with a truthy
value which the module overwrites. (Why?!?) Anyway, most libraries don't care
whether module.exports exists, but those that do tend to malfunction (set up
a window global) if they don't see something there. Since it seems that more
modules expect module.exports and fail than those that don't see it and fail,
require now passes an empty object.

But, for those modules that malfunction if module.exports is there, you can
suppress it by appending a tilde to your path. In other words:

    require('path/to/module.js'); // module will be {exports:{}}
    require('path/to/module.js~'); // the ~ will be stripped; module will be {}

This allows more libraries to be loaded unmodified without polluting global
namespace and is thus a Good Thing™.

Note that the tilde is supported by `require.lazy`, and the name is preserved
by `require.preloadData()`.
*/
/* jshint latedef:false */
/* global console */

(function(global) {
  'use strict';
  const modules = {};
  const module_file_names = {};
  const dependency_map = {};
  const modules_loaded_synchronously = [];
  const require_utils = {};
  const _global_require = global.require;
  let autoPreload_enabled = 0; // also used to throttle saving of preload data
  const auto_preload_path = `_require_preloadData_${window.location.pathname}`;

  // path/to/../foo -> path/foo
  const collapse = path => {
    while (path.match(/([^/]+\/\.\.\/)/)) {
      path = path.replace(/([^/]+\/\.\.\/)/g, '');
    }
    return path;
  };

  function define(module_name, source_code) {
    const path = module_name.split('/');
    const file_name = path.pop();
    console.log(file_name);

    /* detect conflicting paths for the same file_name */
    if (module_file_names[file_name]) {
      if (module_file_names[file_name] !== module_name) {
        console.error(`${file_name} requested from multiple paths, e.g. ${module_name}, ${module_file_names[file_name]}`);
        debugger; // jshint ignore:line
      }
    } else {
      module_file_names[file_name] = module_name;
    }

    /* jshint evil:true */
    if (! modules[module_name]) {
      let module = module_name.substr(-1) === '~' ? {} : {exports:{}};
      let factory = new Function(
          'module', 'require', `${source_code}\n//# sourceURL=${module_name}`);
      /* jshint evil:false */
      const local_require = _relative(path, module_name);
      Object.assign(local_require, require_utils);
      factory(module, local_require);
      modules[module_name] = module;
    }
    return modules[module_name];
  }

  function _relative_path(path, module) {
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
    // reduce paths, e.g. 'foo//bar//.//baz' => 'foo/bar/baz'
    return module.replace(/([^:])\/\//g, '$1/').replace(/\/\.\//g, '/');
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
      debugger; // jshint ignore:line
    }

    const _r = (module) => {
      module = _relative_path(path, module);

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
    _r.lazy = module_name => _lazy(_relative_path(path, module_name));

    return _r;
  }

  function _require(module_name) {
    if (module_name.substr(0, 2) === './') {
      module_name = module_name.substr(2);
    }

    module_name = collapse(module_name);

    if (! modules[module_name]) {
      if (! _files[module_name]) {
        let request = new XMLHttpRequest();
        modules_loaded_synchronously.push(module_name);
        console.warn(module_name, 'was loaded synchronously');
        if (autoPreload_enabled) {
          _savePreloadData();
        }
        request.open('GET', module_name.substr(-1) === '~' ? module_name.slice(0,-1) : module_name, false);
        request.send(null);
        if (request.status === 200) {
          define(module_name, request.responseText);
          _files[module_name] = true;
        } else {
          console.error('could not load required module', module_name);
          return {};
        }
      } else {
        define(module_name, _files[module_name]);
        _files[module_name] = true;
      }
    }

    return modules[module_name].exports;
  }

  const _file_promises = {};
  const _files = {};
  function _file(module_name) {
    if (module_name.substr(0, 2) === './') {
      module_name = module_name.substr(2);
    }

    if (!_file_promises[module_name]) {
      _file_promises[module_name] = new Promise(function(resolve, reject) {
      const request = new XMLHttpRequest();
        request.open('GET', module_name.substr(-1) === '~' ? module_name.slice(0,-1) : module_name, true);
        request.onload = function(data) {
          if (request.readyState === 4) {
            if (request.status === 200) {
              if (! modules[module_name]) {
                _files[module_name] = request.responseText;
              }
              resolve(request.responseText);
            } else {
              reject(request, data);
            }
          }
        };
        request.onerror = function(data) {
          reject(request, data);
        };
        request.send(null);
      });
    }

    return _file_promises[module_name];
  }

  const _lazy_module_promises = {};
  function _lazy(module_name) {
    if (module_name.substr(0, 2) === './') {
      module_name = module_name.substr(2);
    }

    if (!_lazy_module_promises[module_name]) {
      _lazy_module_promises[module_name] = new Promise(resolve => {
        if (!modules[module_name]) {
          _file(module_name).then(source => resolve(define(module_name, source).exports));
        } else {
          setTimeout(() => resolve(modules[module_name].exports));
        }
      });
    }
    return _lazy_module_promises[module_name];
  }

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

  let savePreloadDataTimeout = 0;
  const _savePreloadData = () => {
    if (savePreloadDataTimeout) {
      clearTimeout(savePreloadDataTimeout);
    }
    savePreloadDataTimeout = setTimeout(() => {
      console.time('savePreloadData');
      localStorage.setItem(auto_preload_path, _preloadData(false));
      console.timeEnd('savePreloadData');
    }, autoPreload_enabled);
  };

  setTimeout(() => {
    const unused_modules = Object.keys(_file_promises).filter(module_name => ! modules[module_name]);
    if (unused_modules.length) {
      console.warn(`${unused_modules.join(', ')} were preloaded but not used`);
    }
  }, 5000);

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
        console.error('dependency deadlock', module_list);
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
        return Promise.all(wave.map(_file)).
               then(() => waves.length ? preload(waves) : null).
               catch(e => {
                  console.error('preload failed', e);
                  if (localStorage.getItem(auto_preload_path)) {
                    localStorage.removeItem(auto_preload_path);
                    window.location.reload();
                  }
               });
      }
    }
    return preload([[].concat(...waves)]);
  };

  const _autoPreload = (save_preload_data_throttle_ms) => {
    autoPreload_enabled = save_preload_data_throttle_ms || 2000;
    return new Promise(resolve => {
      const waves = localStorage.getItem(auto_preload_path);
      if (waves) {
        console.log('autoPreload data found');
        _preload(JSON.parse(waves)).then(resolve);
      } else {
        console.warn('no preload data found');
        resolve();
      }
    });
  };

  const dependents = (module_name, list) => {
    if (!list) {
      list = [];
    }
    Object.keys(dependency_map).forEach(module => {
      const module_deps = dependency_map[module];
      if (list.indexOf(module) === -1 && module_deps.indexOf(module_name) > -1) {
        list.push(module);
        dependents(module, list);
      }
    });
    return list;
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
    dependents,
    isDefined (module_name) {
      return !!modules[module_name];
    },
    relative: _relative,
    preloadData: _preloadData,
    preload: _preload,
    autoPreload: _autoPreload,
    viaTag: _viaTag,
    electron: global.process && global.process.versions.electron,
    electron_remote: global.process && _global_require('electron').remote,
    globalRequire: _global_require,
    modules: () => modules,
  });

/*
  Electron exposes "module" global that confuses scripts imported via tag
*/
  if (global.module) {
    _require._global_module = global.module;
    delete global.module;
  }

  _require.lazy = _lazy;
  global.require = _require;
  Object.assign(global.require, require_utils);
}(this));
