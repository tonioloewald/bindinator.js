# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two projects live here

- **Repo root** — `b8r`, published to npm as `b8rjs`. Plain ES modules, no
  build step required to develop, browser-first.
- **`b8r-tjs/`** — a separate port of b8r onto tosijs/tjs, with its own bun
  toolchain, its own `package.json`, and **its own `CLAUDE.md` — read that one
  before touching anything in there.**

`b8r-tjs/` is excluded from every root-level tool (prettier, eslint, the
`files` list) and is not part of the published package. Don't lint, format, or
bundle it from the root.

## Commands

```
npm start          # dev server on :8017, serves the repo as the doc site
npm run build      # format -> lint html/css -> rollup -> uglify into dist/
npm run format     # eslint --fix, then prettier --write
npm run lint       # eslint --fix only
```

**There is no `npm test`.** Tests are browser-based:

- `npm start`, then open `http://localhost:8017/test/unit-tests.html` — 52
  assertions, should be 52 `.success` / 0 `.failure`. To check programmatically:
  `document.querySelectorAll('.failure').length`.
- The doc site itself runs the `~~~~` blocks embedded throughout the source as
  a second suite (51 of them) and reports a pass/fail badge top-right. **3 of
  those 51 currently fail** — pre-existing, not something you broke.

To run a single test, edit `test/unit-tests.html`; the suite has no filtering.

## The one hard constraint: no runtime dependencies

`package.json` has no `dependencies`, only `devDependencies`, and that is a
feature the README advertises. Never add a runtime dependency. A practical
consequence: every `npm audit` finding here is dev-only and reaches no
consumer of the published package.

## Architecture

`source/b8r.js` is the entry point and assembles ~25 sibling modules into one
object. The pieces that matter:

- **`registry.js`** — the state store. Paths are strings (`'app.user.name'`,
  `'list[id=17].value'`), parsed by `byPath.js`. `b8r.reg` is a proxy over it,
  so `b8r.reg.model.text = 'x'` triggers updates.
- **`toTargets.js` / `fromTargets.js`** — the binding engine, and the clearest
  thing to read to understand b8r. `data-bind="value=path.to.data"` maps a
  _target_ (an element property/attribute) to a registry path. `toTargets`
  writes data into the DOM; `fromTargets` reads user changes back out. A few
  targets (notably `value`) appear in both, which is what makes bindings
  two-way.
- **`component.js`** — loads and instantiates components; `load` ends up either
  an `AsyncFunction` built from the component's script or the literal `false`
  sentinel, which `b8r.js` guards with `if (component.load)`.
- **`update.js` / `dispatch.js` / `events.js`** — async update queue and event
  delegation. b8r binds one listener per event type at the document level and
  routes via `data-event`, rather than attaching listeners per element.

Bindings are declared in HTML attributes (`data-bind`, `data-event`,
`data-list`, `data-component`), so **grep the HTML, not just the JS**, when
tracing how a value reaches the screen.

### Components come in two formats

86 `.html` components (markup + `<style>` + `<script>` in one fragment) and 20
`.js` components (an exported object with `css`/`html`/`view`/`load` keys). The
`.js` form is current; the `.html` form is legacy but fully supported and still
the majority. Both are loaded by `component.js`.

Component `load`/`initialValue` receive a fixed destructured signature —
`{component, b8r, data, get, set, on, find, findOne, touch, register}` — and
most components use only a few of those. That is why eslint runs with
`no-unused-vars: {args: 'none'}`; a destructured property can't take an `_`
prefix without aliasing it.

### Literate source

~70 files in `source/` and `lib/` open with a `/** ... */` block that _is_ the
published documentation — the doc site renders it directly. Inside those
blocks, `~~~~`-fenced code is executed as a test. So:

- Editing a doc comment can change documentation **and** test results.
- Prettier does not reformat comment interiors, and `.md` files are configured
  with `embeddedLanguageFormatting: off`, so reformatting leaves all 51 test
  blocks byte-identical. Keep it that way.

### The doc site runs on a service worker

`vfs.js` installs a service worker providing a virtual filesystem at `/vfs/`,
which the fiddle/editor components need in order to `import()` code written at
runtime. Consequences when testing in a browser:

- A **blank doc site** usually means the service worker isn't controlling the
  page yet. Load it twice.
- Unregistering the worker breaks the doc site until it re-registers.
- Two copies served on different ports will each register their own worker and
  interfere with each other. Compare builds sequentially, not side by side.

`test/unit-tests.html` does **not** depend on the worker, so prefer it for
verifying library changes.

## Toolchain conventions

Formatting is prettier using **the same `.prettierrc.json` as tosijs**, so the
two projects agree on style (no semicolons, single quotes, 2-space, 80 cols).
eslint covers correctness only and is configured never to fight prettier.

**Both tools are currently silent, and the maintainer wants them kept that
way** — zero warnings, not just zero errors. When a rule fires, fix the code
rather than deleting the token that trips it: a dead store usually means the
control flow wants restructuring, and a default value that is never read is
often a type contract being silently defeated.

Two deliberate config choices worth not "fixing":

- `no-redeclare` runs with `builtinGlobals: false`. Files carry
  `/* global console, requestAnimationFrame */` comments from before flat
  config; they now duplicate `globals.browser` but are harmless.
- **Prettier ignores `*.html`.** Its parser outright rejects four
  `.component.html` files, and these fragments are injected into the live DOM
  where reflowing whitespace inside bound inline content changes what renders.
  `linthtml` owns HTML instead.

Be wary of adding paths to ignore lists. `standard` had `web-component-test.js`
ignored, and that concealed an always-false `if (! x instanceof Y)` guard for
years.

## Build output

`dist/` is committed. `rollup.config.mjs` emits cjs (`b8r.js`), esm (`b8r.mjs`),
and iife (`b8r.iife.js`) from `source/b8r.js`, and `utils/build.command`
minifies each. Rebuild and commit `dist/` whenever you change `source/`.

`dist/b8r.js` throws `window is not defined` under node. That is expected —
it's a browser library, and bundlers resolve it fine.

## Dev server

`utils/server.js` is a small static server with one extra: `/screencap/<path>`
renders a page via puppeteer. **Puppeteer is deliberately not a dependency**
(chromium download, large transitive tree); the require is lazy and the
endpoint returns 501 with an install hint when it's absent. `npm i puppeteer`
yourself if you want it. The snapshot-testing feature it was meant to serve is
documented but was never implemented.
