# CLAUDE.md — b8r-tjs

A ground-up reimagining of bindinator (b8r): the tosijs primitives expressed in
the **tjs** language, runtime-type-safe and literate, with **no `vfs`**. See
`README.md` for the full thesis. This file is the working guide.

## Commands

```bash
npm install      # tjs-lang + tosijs
npm run build    # transpile src/**/*.tjs -> dist/**/*.js (single pass via tjs)
npm test         # build, then node --test against dist/
```

## How the build works

`build.mjs` walks `src/**/*.tjs`, runs each through `tjs(source)` from
`tjs-lang/lang`, and writes the emitted JavaScript to `dist/`. There is **no
bundler and no TypeScript step** — `tjs` strips the example-types, injects
runtime validation, runs inline `test` blocks, and emits standalone JS (each
file carries a minimal inline runtime fallback). `dist/` is gitignored.

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
   `test/compile.test.mjs` guards it (incl. a wrong-typed call returning a
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

## Layout

- `src/` — framework source, authored in `.tjs`.
- `examples/` — literate example components (target authoring model; not built).
- `test/` — Node tests run against built `dist/`.
- `build.mjs` — the `.tjs` → `.js` transpiler.
