# Contributing

All contributions are welcome, but please include inline examples, documentation, and tests where
possible and keep PRs as specific as possible.

Thanks for even _thinking_ about contributing!

## Building b8r

```
npm install
npm run build
```

`npm run build` formats (`eslint --fix`, then `prettier --write`), lints the
HTML and CSS, then bundles `source/b8r.js` with [rollup](https://rollupjs.org/)
and minifies with [uglify-es](https://www.npmjs.com/package/uglify-es) into
`dist/`. Everything it needs is a devDependency — nothing has to be installed
globally.

Formatting is [prettier](https://prettier.io) using the same config as
[tosijs](https://github.com/tonioloewald/tosijs), so the two projects agree on
style. `eslint` covers correctness only and does not fight prettier. Both are
currently silent — please keep them that way.

Tests run in a browser: `npm start`, then open `/test/unit-tests.html`.
