# CLAUDE.md — b8r-tjs

A ground-up reimagining of bindinator (b8r): the tosijs primitives expressed in
the **tjs** language, runtime-type-safe and literate, with **no `vfs`**. See
`README.md` for the full thesis. This file is the working guide.

## Commands (bun-first)

```bash
bun install      # tjs-lang (the only dependency)
bun test         # build.mjs (inline + signature tests) then bun:test integration
bun run build    # produce distributable dist/ + gate inline/signature tests
bun start        # build dist + demo bundles, then serve → http://localhost:8030/demo/docs.html
```

**Running the demos (this is its own dir):** the b8r-tjs work lives in `b8r-tjs/`;
the repo-root `bun start` runs the *old* b8r site (`:8017`), not this. From
`b8r-tjs/`, `bun start` (= `bun run demos` + `demo/serve.mjs`) builds `dist/`, runs
`demo/vendor.mjs` (vendors tosijs, generates the docs array, bun-bundles the
tosijs-ui demos), and serves the project root. Demos: `/demo/docs.html`
(doc-browser), `/demo/live-example.html`, `/demo/blueprint.html`, `/demo/list.html`.

The tooling targets **bun**. `bunfig.toml` preloads `tjs-bun-plugin.ts`, which
runs every imported `.tjs` file through `tjs()` — so `.tjs` imports directly with
**no build step** for development or tests. (tjs also does true TypeScript
transpilation, so `.ts` works too; we author framework source in `.tjs` to get
the example-types → runtime-validation + signature tests.)

## How the build / loaders work

- **Dev & tests:** import `.tjs` directly under bun (the plugin transpiles on
  load, `runTests: false`). `test/*.test.ts` use `bun:test`.
- **Inline/signature tests:** `build.mjs` (run via `bun ./build.mjs`) walks
  `src/**/*.tjs`, runs each through `tjs(source)` with tests on, fails the build
  on any failure, and writes standalone JS to `dist/` (gitignored). This is the
  test gate for self-contained logic and the distributable emitter. No bundler.
- **Loading compiled source (the vfs killer):** `src/compile.tjs` `toModuleUrl`
  builds a **base64** `data:` URL — *not* percent-encoded. Why: bun's data:
  loader misclassifies a percent-encoded module as CJS when it assigns metadata
  to an exported binding (tjs emits `fn.__tjs = {…}`), collapsing named exports
  to `{default,__esModule}`. base64 is read as ESM correctly (and is UTF-8 safe).
  Node and browsers handle either form; base64 is the portable choice (raw/
  unencoded URLs are also unsafe — `#` parses as a fragment, `%` as an escape).
  Don't revert it. Full write-up + minimal repro: `docs/bun-data-url-esm-bug.md`.

## Writing tjs (read before editing `.tjs`)

tjs is **not** TypeScript. The single biggest trap:

- `function f (x: 'World')` — the colon value is an **example**, not a type.
  `'World'` widens to `string`; `0` → integer; `3.14` → float; `1` → integer.
- Colon-shorthand works on **`function` declarations**, not on object-method
  shorthand (`{ method (x: 1) {} }` is a parse error — pull the logic out into a
  top-level typed function instead).
- **Use return-type examples — they're free signature tests.** `function f (n:
  3): 6 { ... }` makes tjs run the param examples through `f` at build time and
  fail the build if the result isn't `6`. Give one whenever a single value is
  representative (e.g. `pathsOverlap(a, b): true`). Only omit it when no single
  value is (the function returns an object, varies, etc.).
- **Write inline `test` blocks, not separate files, for self-contained logic.**
  `test 'desc' { expect(step(5, 2)).toBe(7) }` runs inside the source; `tjs()`
  executes it at build time and `build.mjs` fails the build on any failure
  (confirmed). Keep Node `test/*.test.mjs` only for what inline tests can't
  express — async `import()`, the `data:`-URL load path, cross-module behaviour.
  (Inline tests run at transpile time, before imports resolve, so a module that
  imports another can't inline-test code that calls the import.)
- Errors are **returned** as `MonadicError`, not thrown (`isMonadicError(v)` /
  check `v?.name === 'MonadicError'`).
- Style matches tjs/tosijs/standard: single quotes, no semicolons, 2-space.

Reference (in the installed package): `node_modules/tjs-lang/CLAUDE.md` and
`node_modules/tjs-lang/llms.txt`.

## Design principles (don't regress these)

1. **No `vfs`.** `src/compile.tjs` is why: `tjs(source).code` →
   `data:text/javascript,<encoded>` → `await import(...)`. Edited source becomes
   a live, type-validated ES module with no file and no service worker.
   `test/compile.test.ts` guards it (incl. a wrong-typed call returning a
   `MonadicError`). Keep that path intact.

2. **Not "reactive."** The view is never a function of state; nothing re-renders
   wholesale. State is **stable by default** (`set` to an unchanged value
   notifies no one; mutate-in-place + `touch` to force). **Bindings are wiring**:
   an observer watches a path and does one specific update when it changes. Don't
   introduce VDOM/diffing/"view = f(state)". The word "reactive" stays out.

3. **Components are redefinable definitions, not custom elements.** A component
   is a definition in an owned registry, reused by every instance and swappable
   at runtime. Do **not** build the component model on `customElements` — their
   definitions are immutable once registered, which kills hot reload / live
   editing (the payoff loop: edit tjs → `compile()` → reinstall definition → live
   instances update). Shadow DOM is opt-in, not the model.

4. **Build on tosijs (rebase in progress).** The pure-tjs primitives
   (`observe`/`elements`/`css`/`component`) proved the model, but the project is
   rebasing onto **tosijs + tosijs-ui** rather than reinventing them (esp.
   tosijs-ui's ~50 components). b8r-tjs keeps its novel half — compile / live-edit
   / AJS / SSG+hydration — and adds a **b8r→tosijs compatibility adapter**
   (`src/b8r-compat.tjs`). Runtime deps: `tjs-lang` + `tosijs`. The old primitives
   still build/pass and stay until superseded.

5. **Safe by default, fast where it counts.** Validated typed boundaries are the
   default — that is what makes running edited/untrusted code safe. Don't scatter
   `!` unsafe markers. *If* profiling shows the binding-apply / DOM-update inner
   loop is hot, make that one layer an explicit unsafe cutout (`!` /
   `safety none`) and batch DOM writes. A fenced exception, never the norm.
   ("Bindings are wiring" already removes the VDOM-diff cost, so the only thing
   left to cut is per-apply validation.)

6. **The renderer runs headless and hydrates.** Build the render path on a
   headless DOM (`linkedom`) so it works in Node, not just a browser. This is one
   capability serving three needs: unit tests without a browser; **static
   generation** (pre-render component definitions to HTML for SEO + TTFI); and
   **hydration** — the same render must be able to *adopt* existing DOM and wire
   bindings to it, never blow it away and rebuild.

## Compatibility / breakage

See **`COMPATIBILITY.md`** for where b8r-tjs diverges from b8r (deliberate /
not-yet / hard limits). Keep it current: when you hit or fix a divergence, record
it there, and prefer a runtime `console.warn` for detectable deprecated patterns
(so breakage surfaces instead of failing silently) plus a test that asserts it.

## Disposal / migration

See **`MIGRATION.md`** for the full triage (what to dispose / migrate / keep) and
the tree-shaking plan. TL;DR: `src/` is two disconnected clusters — the active
**tosijs rebase** (`b8r-compat`/`b8r-elements`/`b8r-blueprint`/`b8r-component`/
`b8r-example`) and the **pre-rebase primitives** (`observe`/`elements`/`css`/
`component`, exported by the `index.tjs` barrel). The primitives are superseded by
tosijs and slated for removal; the novel half (`compile`/`live`/`untrusted`) is
kept but must be re-pointed off the old `component.tjs` first.

## Deferred / follow-ups (come back to these)

Two are clean **upstream asks** (tosijs / tosijs-ui), tracked here so we don't lose them:

1. **Use tjs instead of sucrase for the `<live-example>` transform.** tjs already
   does true TS transpilation and is already a dependency, so it'd collapse the
   toolchain onto one transformer and drop sucrase + its CDN fallback. The
   `TransformFn` signature is compatible — `code => ({ code: tjs(code).code })`.
   Blocker: `LiveExample.refresh()` hardcodes `await loadTransform()` (sucrase) with
   no injection hook. Fix path: small PR to tosijs-ui to make the transform
   injectable (`liveExample({ transform })` or `context.transform`); then pass a tjs
   adapter. Bonus payoff: fiddles would get tjs example-types → runtime validation
   and inline `test` blocks for free (very on-brand for the literate docs site).

2. **`${.relative}` interpolation inside list rows.** Today it's a documented
   no-op (see `b8r-compat.js` header): tosijs re-targets a row's relative `^.path`
   on the binding's single `path` field during stamping, but interpolation routes
   through a multi-path `TakeDescriptor` whose `paths[]` array isn't part of that
   rewrite — so `^` entries never resolve to the item. A build-time
   `tosiPath(item)` rewrite works but is fragile for non-`idPath` lists (index
   paths break under reordering). **Preferred fix:** have tosijs **expose the
   relative-binding (`^`) resolution mechanism** that `bind` uses, so a
   TakeDescriptor's `paths[]` can be re-targeted per row the same way single-path
   bindings are. Upstream tosijs enhancement.

3. **Box scalars in the tosijs proxy** (`Number`/`String`/`Boolean`) so structural
   comparison "just works" — long-deferred original goal; revisit when it matters.

4. **A literate docs build on tjs-lang** (bigger idea). The docs site is generated
   from source by `demo/build-docs.mjs` (extract the first `/*# … */` block per file
   + curated `.md` pages → a `docs` array) — a pragmatic clone of tosijs-ui's
   `tosijs-ui-docs` CLI. Since **tjs already parses sources, carries doc comments,
   and runs inline `test` + signature tests**, a tjs-native version could unify
   extraction with test execution: emit each page's `testStatus` (the doc-browser
   `Doc` type already has the field) from the file's inline tests, and validate the
   fenced examples as it goes. Either leverage `tosijs-ui-docs` or build the small
   tjs-powered equivalent. For now the extractor is deliberately minimal.



- `src/observe.tjs` — path-observed state (`register`/`get`/`set`/`observe`/
  `touch`). Stable by default. `batch(fn)` is the opt-in perf cutout: coalesces a
  burst of changes so each observer fires once (default path stays synchronous).
  See `docs/perf.md` for the benchmark + why the unsafe validation-skip is off.
- `src/elements.tjs` — element creator. Props: `style` (object), attributes,
  `on*` handlers, and `bind*` markers. Wiring is recorded as **serializable
  attributes** (so it survives to static HTML and hydration): `bindText: 'x'` →
  `data-bind="text:x"`; `onClick: 'inc'` (string method name) →
  `data-event="click:inc"`. An `on*` *function* is attached directly with
  `addEventListener` (client-only, not serializable). This module never touches
  state — only records wiring intent.
- `src/css.tjs` — `css(spec)` → CSS string (camelCase → kebab); `vars.fooBar` →
  `var(--foo-bar)`. Pure, so covered by inline + signature tests.
- `src/component.tjs` — the redefinable registry. A definition is `{ name, state,
  methods, style, view }`; events are **named methods** `methods.foo(ctx, event)`.
  Instance state lives under `_c.<instanceId>` in the observe registry; a view's
  `ctx.get/ctx.set` are scoped to that path. `defineComponent` (re)registers and
  re-renders live instances; `mount` builds the DOM; `renderToString` bakes a
  static HTML snapshot (SSG); `hydrate` adopts existing server DOM in place (no
  rebuild). All of these wire by walking for `data-bind`/`data-event` attributes
  — one code path for mount, SSG, and hydration. **Don't** route through
  `customElements`. **Note:** the registry/instances are module singletons, so in
  bun tests (shared module cache) use a unique component `name` per test file.
- `src/compile.tjs` — the vfs-free loader (imports `tjs-lang`; kept out of the
  `index.tjs` barrel).
- `src/live.tjs` — the live-edit loop. `applyEdit(source)` compiles an editable
  `(lib) => spec` factory (no imports — primitives injected as `lib`, so the
  compiled module loads from a `data:` URL anywhere) and `defineComponent`s the
  result. Imports `compile.tjs`, so also kept out of the barrel.
- `src/untrusted.tjs` — `defineUntrusted` / `runHandler`. Handlers are AJS source
  run in `AgentVM` (`tjs-lang/vm`) as pure `({ state, event }) -> newState`
  transforms: fuel-metered, capability-isolated. `runHandler` never throws —
  parse rejections and fuel exhaustion come back as `{ ok: false, error }`. Imports
  `tjs-lang`, so kept out of the barrel.
- `src/b8r-compat.tjs` — b8r → tosijs adapter. `hydrateB8r(root)` / `bindElement`
  walk b8r `data-bind`/`data-event` attributes and wire them with tosijs
  `bind`/`bindings`/`on`/`xin`. b8r targets (`attr`/`style`/`class`/`showIf`…) are
  implemented as tosijs `XinBinding`s. Imports `tosijs`; kept out of the barrel.
- `src/b8r-compat` is **plain `.js`, not `.tjs`** — it's tosijs-proxy glue, and
  tjs's value-semantics transforms (`TypeOf`, `toBool`, structural `==`) misread
  tosijs **boxed proxies**. `build.mjs` copies `src/*.js` verbatim; author
  proxy-heavy adapters in `.js`.
- **`data-list="path:idPath"` (+ `data-virtual`) → tosijs list bindings**, working
  (incl. windowed virtual rendering), verified headless and in a real browser.
  Three things were essential — don't regress them:
  1. **List proxy:** navigate the exported **`boxed`** registry (`boxed.<path>`),
     not deprecated `boxedProxy(xin.<path>)`.
  2. **Item-relative paths are `^`-template paths:** a b8r `text=.name` binds to
     the string path **`^.name`** (`bind(el, '^.name', binding)`) — tosijs binds
     `^` to the array item and re-targets per row on stamp. Do NOT pass a
     navigated item proxy.
  3. **Container attributes go in as PROPS:** `elements[tag](props, ...tuple)`
     (like `div({class}, ...listBinding(...))`). Setting `class` via `setAttribute`
     *after* the list is bound makes tosijs reset the container and drop the rows.
  4. **Parameterised targets are binding FACTORIES, not `options.arg` readers.**
     tosijs calls a binding as `toDOM(element, value)` — there is **no options
     argument** on the list-stamp path (`$.binding.toDOM(f, k[$.path])`). So
     `attr(x)` / `class(x)` / `style(x)` / `showIf(v)` etc. are `arg => XinBinding`
     factories that **close over the arg** (matching tosijs's own `attr`/`style`),
     memoised by `name(arg)` in `bindingFor`. (A direct `bind(el, p, b, {arg})`
     happened to forward options, so non-list attr/class "worked" — but list rows
     threw `options.arg` undefined. Don't reintroduce `options.arg`.)
  `data-virtual="<rowHeight>"` → `options.virtual.height`; `data-columns` /
  `data-chunk` → `visibleColumns` / `rowChunkSize`. (linkedom can't fully render
  virtual scroll, but headless still verifies the rows; full virtual is checked in
  a real browser via Haltija + `demo/list.html`.)
  - **Row events are delegated, not per-row.** tosijs stamps rows by cloning the
    template prototype, and `cloneNode` drops `addEventListener` handlers — so
    `bindRowElement` leaves `data-event` attributes in place and `bindList` attaches
    ONE listener per event type to the list container (`delegateRowEvents`). On an
    event it walks target→container, matches the `data-event` type (+ key qualifier),
    and resolves the handler *per event*: a relative `.foo` path is looked up on the
    clicked row's item (via tosijs `getListItem`), an absolute path through `resolve`
    + the xin registry. This survives virtual-list row recycling (verified: after
    scrolling deep, clicking a recycled row still resolves to the right item).
- `src/b8r-component.tjs` — legacy `.component.html` loader. `loadB8rComponent`
  parses docs/`<style>`/markup/`<script>`, returns `mount(target, data)`: creates
  a per-instance scope (`_b8r.<id>` in `xin`), hydrates the markup (rewriting
  `_component_.x` → the scope), and runs the `<script>` via `AsyncFunction` (tjs
  passes it through) with a b8r-style context. Trusted compat code (untrusted →
  AJS). Imports `tosijs` + `b8r-compat`; kept out of the barrel.
- `src/b8r-blueprint.js` — **modern b8r component loader** (the ESM-object form;
  the b8r analogue of tosijs's blueprint loader). A component is a default export
  `{ css?, html?|view?, load?, initialValue?, type? }`. `defineB8rComponent(name,
  spec)` (re)registers it in an **owned, redefinable registry** and re-stamps every
  live instance (hot reload — **design principle #3**, not `customElements`);
  `loadB8rComponent(name, module)` takes an imported module namespace;
  `mountB8rComponent(target, name, data)` instantiates. `view(elements)` builds DOM
  (via `b8r-elements`) that records `data-bind`/`data-event`, hydrated through the
  adapter with `_component_.x` → `_b8r.<id>` scope. `initialValue` may be an object
  or `({ component }) => object`; `component.data` reads the live instance proxy so
  captured methods mutate current state. Also runs a legacy string `load` body
  (`<script>`) via `AsyncFunction`. Plain **`.js`** (tosijs-proxy glue); imports
  `tosijs` + `b8r-compat` + `b8r-elements`; kept out of the barrel.
- `src/b8r-elements.js` — **ported** b8r `elements` creator (`create` + the
  `elements` proxy). Builds plain DOM and records binding intent as serializable
  `data-bind`/`data-event` attributes (`bindX:`→`data-bind="x=…"`, `onX:`→
  `data-event="x:…"`, `dotted.key`→method binding, `dataList:`→`data-list`). A
  faithful port (no b8r dependency — "port, don't depend"); plain **`.js`**.
- `src/b8r-targets-extra.js` — **opt-in, tree-shakeable** extra binding targets
  (`format`/`img`/`bgImg`/`bytes`/`timestamp`/`json`), registered via
  `registerExtraB8rTargets()` (over `b8r-compat`'s `registerB8rBindings` extension
  point). Kept out of the core adapter so it's only bundled when imported — the
  pattern for any heavier helper. Plain **`.js`**.
- `src/b8r-example.js` — bridge from **tosijs-ui's `<live-example>`** (the docs
  fiddle component) to the blueprint loader, so b8r components render as live
  fiddles. `<live-example>` runs its `js` pane as a function with `preview` + its
  `context` in scope (the transform is internally sucrase, not overridable), so the
  seam is the **context**: spread `b8rExampleContext` into a live-example's
  `context` and a b8r fiddle's `js` is one call — `renderB8rExample(preview, spec)`
  (mounts a `{ css, view, initialValue, … }` spec via `defineB8rComponent` + mount).
  tosijs examples run unchanged; b8r ones call the helper (or
  `import … from 'b8r-tjs'`). Imports `b8r-blueprint` + `b8r-compat`; plain **`.js`**;
  kept out of the barrel. Verified in a real `<live-example>` via Haltija
  (`demo/live-example.html`, bundled by `demo/vendor.mjs`). **NB:** tosijs-ui's ESM
  uses extensionless imports + needs sucrase, so the demo is **bun-bundled** (one
  shared tosijs instance, sucrase inlined) — don't try to serve its dist as raw ESM.
  The same `b8rExampleContext` wires the **doc-browser** (`demo/docs.html`,
  `docs.entry.js`): `createDocBrowser({ docs, context: { tosijs, ...b8rExampleContext } })`
  threads the context into every live-example embedded in the markdown, so a docs
  page authored with a `renderB8rExample(preview, spec)` code fence becomes a live
  b8r fiddle. Docs are `.md` files imported as text (bun `.md` loader) so their
  `${…}` stays literal. The full nav + b8r fiddles (counter + to-do with list,
  two-way input, interpolation) are Haltija-verified.
- `src/index.tjs` — authoring barrel (observe + elements + css + component).
- `examples/` — literate example components (not built).
- `test/_dom.mjs` — shared headless-DOM setup for **tosijs**-backed tests.
  `setupDom()` is **idempotent and returns ONE shared document** — every DOM test
  file must use it (not its own `parseHTML`), because bun shares the module cache
  and tosijs reads `globalThis.document` at call time; divergent documents make
  bindings/events silently miss. tosijs also needs DOM globals at import (incl.
  `HTMLInputElement`), updates on `requestAnimationFrame`, and uses delegated
  events — so connect elements to `document` and `await tick()` after state changes.
- `test/*.test.ts` — `bun:test`, headless via `linkedom` (a `parseHTML` document
  assigned to `globalThis.document`). For DOM/cross-module/async behaviour;
  self-contained logic is covered by inline tests in the `.tjs` sources.
- `build.mjs` — `.tjs` → `dist/` transpiler + inline/signature-test gate.
