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
- Avoid giving a return-type example unless it is genuinely representative: tjs
  runs the example through the function at transpile time and fails the build if
  the result is inconsistent (types double as tests).
- Errors are **returned** as `MonadicError`, not thrown (`isMonadicError(v)` /
  check `v?.name === 'MonadicError'`).
- Style matches tjs/tosijs/standard: single quotes, no semicolons, 2-space.

Reference (in the installed package): `node_modules/tjs-lang/CLAUDE.md` and
`node_modules/tjs-lang/llms.txt`.

## The core idea (don't regress it)

`src/compile.tjs` is the reason there is no `vfs`:

```
tjs(source).code  ->  data:text/javascript,<encoded>  ->  await import(...)
```

Edited component source becomes a live, type-validated ES module with no file
and no service worker. `test/compile.test.mjs` guards this (including that a
wrong-typed call returns a `MonadicError`). Keep that path intact.

## Layout

- `src/` — framework source, authored in `.tjs`.
- `examples/` — literate example components (target authoring model; not built).
- `test/` — Node tests run against built `dist/`.
- `build.mjs` — the `.tjs` → `.js` transpiler.
