rollup -c

# uglify
uglifyjs dist/b8r.mjs -c -m -cmo dist/b8r.min.mjs --source-map url=dist/b8r.min.mjs.map
uglifyjs dist/b8r.js -c -m -cmo dist/b8r.min.js --source-map url=dist/b8r.min.js.map
uglifyjs dist/b8r.iife.js -c -m -cmo dist/b8r.iife.min.js --source-map url=dist/b8r.iife.min.js.map
