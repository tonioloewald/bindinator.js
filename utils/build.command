# build esm
rollup source/b8r.js --file dist/b8r.mjs --format esm --inlineDynamicImports true
uglifyjs dist/b8r.mjs -c -m -cmo dist/b8r.min.mjs --source-map url=dist/b8r.min.mjs.map

# build cjs
rollup source/b8r.js --file dist/b8r.js --format cjs
uglifyjs dist/b8r.js -c -m -cmo dist/b8r.min.js --source-map url=dist/b8r.min.js.map
