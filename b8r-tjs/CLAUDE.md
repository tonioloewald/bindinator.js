# CLAUDE.md — b8r-tjs

A ground-up reimagining of bindinator (b8r): the tosijs primitives expressed in
the **tjs** language, runtime-type-safe and literate, with **no `vfs`**. See
`README.md` for the full thesis. This file is the working guide.

## Commands (bun-first)

```bash
bun install      # tjs-lang (the only dependency)
bun test         # build.mjs (inline + signature tests) then bun:test integration
bun run build    # produce distributable dist/ + gate inline/signature tests
```

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

4. **Port, don't depend.** The tosijs *ideas* (proxy state, element creator, css
   vars) are reimplemented in tjs. The only runtime dependency is `tjs-lang`.

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

## Module map & conventions

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
- `src/index.tjs` — authoring barrel (observe + elements + css + component).
- `examples/` — literate example components (not built).
- `test/*.test.ts` — `bun:test`, headless via `linkedom` (a `parseHTML` document
  assigned to `globalThis.document`). For DOM/cross-module/async behaviour;
  self-contained logic is covered by inline tests in the `.tjs` sources.
- `build.mjs` — `.tjs` → `dist/` transpiler + inline/signature-test gate.
