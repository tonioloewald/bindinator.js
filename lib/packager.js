/**
# packager

A simple packager that inlines javascript and components to speed up loading.

Usage:

    const inlined_modules = packager.inline_modules(['foo.js', 'bar.js', ...]);

In the preceding example, inlined_modules will be the files specified defined
inline (using the `__d` global from `require.js`) and minified using uglify-es.
*/
/* global require, module */

const _isNode = typeof window === 'undefined';
const fs = _isNode ? require('fs') : false;
const {ajax} = _isNode ? {ajax:false} : require('../b8r/b8r.ajax.js');
const {minify} = _isNode ? require('uglify-es') : {minify: false};
const {load, save} = _isNode ? require('./fs-promises.js') : {};

// compress and mangle may actually cause bugs and have almost no useful effect
// on the delivered code size, so set them to false if you see inexplicable issues
const uglify_options = {compress: true, mangle: false};

const contains_debugger = /\n\s*debugger\b/;

const _file =
  _isNode
  ? path => new Promise((resolve, reject) =>
      fs.readFile(path, 'utf8', (err, data) => err ? reject(err) : resolve(data)))
  : path => new Promise((resolve, reject) => ajax(path).then(resolve).catch(reject));

const minified_cache = {}; // name : { source, minified }

function minify_js(name, source) {
  if (! minified_cache[name] || minified_cache[name].source !== source) {
    const {error, code} = minify(source, uglify_options);
    if (! error) {
      minified_cache[name] = {source, minified: code};
    } else {
      console.error('could not minify', name, error);
      minified_cache[name] = {source};
    }
  }
  return minified_cache[name].minified || minified_cache[name].source;
}

function minify_html(name, source, uglify=true) {
  if (! minified_cache[name] || minified_cache[name].source !== source) {
    const minified = source.replace(/<!--[^]*?-->/gm, '')
                           .replace(/(<script.*?>)([^]*)(<\/script>)/gm, (_, start, code, end) => {
                             if (uglify && minify && (! code.match(contains_debugger))) {
                               const minified = minify(code, uglify_options);
                               if (minified.err) {
                                 console.error(`minify failed for ${name}`, minified.err);
                               } else {
                                 code = minified.code;
                               }
                             }
                             return `${start}${code}${end}`;
                           });
    minified_cache[name] = {source, minified};
  }
  return minified_cache[name].minified;
}

const _filter = file_name => ! file_name.match(/third_party|\.min\.js/);
async function inline_modules (path, module_paths, file_filter=()=>_filter, uglify=true) {
  const sources = [];
  for (const i in module_paths) {
    const module_name_raw = module_paths[i];
    const legacy_module = module_name_raw.endsWith('~');
    const module_name = legacy_module ? module_name_raw.slice(0, -1): module_name_raw;
    const source = await _file(path + module_name);
    if (source) {
      if (uglify && minify && file_filter(module_name) && (! source.match(contains_debugger))) {
        sources.push([module_name_raw, minify_js(module_name_raw, source)]);
      } else {
        sources.push([module_name_raw, source]);
      }
    } else {
      console.error(`could not load ${module_name}`);
    }
  }
  return 'console.time("preload");' +
         JSON.stringify(sources) + '.forEach(([module, source]) => __d(module, source));' +
         'console.timeEnd("preload")';
}

async function inline_components (path, component_list, uglify=true) {
  for (const i in component_list) {
    const source_raw = await _file(path + component_list[i].path + '.component.html');
    component_list[i].source = minify_html(source_raw, source_raw, uglify);
  }
  return JSON.stringify(component_list, false, 2);
}

function build({path='', modules=[], components=[]}) {
  return Promise.all([
    // copy filtered version of package.json to public/app.json
    load('package.json').
    then(text => {
      const {name, version, description, author} = JSON.parse(text);
      return save(
        path + 'lib/version.js',
        'module.exports = ' + JSON.stringify({name, version, description, author}, false, 2) + ';\n'
      ).then(() => console.log('building version.js'));
    }),

    // create inlined modules and save as preload.js
    inline_modules(path, modules).
    then(inlined => save(path + 'preload.js', inlined)).
    then(() => console.log('building preload.js')),

    // create inlined components and save as preload.components.json
    inline_components(path, components).
    then(inlined => save(path + 'preload.components.json', inlined)).
    then(() => console.log('building preload.components.json')),
  ]);
}

module.exports = {minify, minify_html, inline_modules, inline_components, build};
