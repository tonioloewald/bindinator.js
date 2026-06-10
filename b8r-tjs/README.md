# b8r-tjs

> A literate, reactive UI framework that is **type-safe at runtime** and has
> **no `vfs`** — the best primitives from [tosijs][tosijs] expressed in the
> [tjs][tjs] language.

This is a ground-up reimagining of [bindinator (b8r)][b8r]. b8r proved that a
reactive framework could be tiny, dependency-free, and *literate* — components
and tests living next to their documentation, editable live in the browser. But
b8r paid for that liveness with hacks: it `eval`'d untyped component scripts, and
its in-browser editor wrote reconstructed components to a **service-worker
virtual file system** (`vfs`) just so the browser's module loader would accept
them.

`b8r-tjs` keeps the good ideas and drops the hacks.

## The thesis

Two projects make this possible:

- **[tosijs][tosijs]** — the modern successor to b8r/xinjs. It gives us three
  primitives we keep verbatim in spirit:
  1. a **state-observer proxy** (`xin` / `tosi` / `observe` / `touch`) — observe
     object state by path, with almost no binding code;
  2. an **element creator** (`elements`) — build real DOM nodes from plain
     JavaScript, so component files no longer carry slabs of HTML;
  3. **first-class CSS variables** (`css` / `vars`) — styles are objects keyed
     off CSS custom properties, so component files no longer carry slabs of CSS.

  Existing HTML still **hydrates** — you opt into the element creator, you are
  not forced into it.

- **[tjs][tjs]** — a TypeScript-like language whose *types are examples that
  survive to runtime* as contracts, documentation, and tests. It transpiles to
  plain JavaScript with runtime validation injected, **in a single pass, in the
  browser, with no build step**. Errors are returned (monadic), not thrown. Its
  sibling **AJS** is a gas-metered VM for running *untrusted* code safely.

Put them together and the things b8r faked become first-class:

| b8r hack | b8r-tjs |
| --- | --- |
| `eval` of untyped component scripts | `tjs(source)` → JS with runtime type-validation |
| `vfs` service-worker round-trip to `import()` edited code | `data:` URL module import of the transpiled string |
| "types" by convention, checked nowhere | examples that are simultaneously types, docs, and tests |
| untrusted components ≈ impossible | AJS gas-metered sandbox |

### The vfs killer, in three lines

```js
import { tjs } from 'tjs-lang/lang'
const { code } = tjs(componentSource)                 // transpile in-process
const mod = await import('data:text/javascript,' + encodeURIComponent(code))
```

No file is written. No service worker is registered. The edited component is a
live ES module with its type-checks already wired in. `src/compile.tjs`
implements exactly this, and `test/compile.test.mjs` proves it round-trips
(including that a wrong-typed call returns a `MonadicError`).

## Why "tjs-first" matters here

`b8r-tjs` is written **in tjs**, not TypeScript. That is the point:

- No TypeScript ceremony, no `as`/`!`/`satisfies` workarounds — you write example
  values, and they *are* the types, the docs, and the tests.
- The same validation runs in the editor, in tests, and in production — there is
  no "types evaporate at runtime" gap to fall through.
- It is a genuinely non-trivial, real-world tjs project: a reactive framework
  with a live editor is exactly the kind of thing tjs exists to make safe and
  literate.

## Status

Early scaffold. What works and is verified today:

- `src/compile.tjs` — `compile()`, `toModuleUrl()`, `load()`: the vfs-free
  literate component compiler. Authored in tjs, built to `dist/`, tested in Node.
- `build.mjs` — transpiles `src/**/*.tjs` → `dist/**/*.js` via `tjs`.

See [`ROADMAP`](#roadmap) for what's next.

## Layout

```
b8r-tjs/
  src/        framework source, authored in .tjs
  examples/   literate example components (the target authoring model)
  test/       Node tests run against the built dist/
  build.mjs   .tjs -> .js transpiler (single pass via tjs)
  dist/       build output (gitignored)
```

## Commands

```bash
npm install      # tjs-lang + tosijs
npm run build    # transpile src/**/*.tjs -> dist/
npm test         # build, then run Node tests against dist/
```

## Roadmap

1. **Compiler** ✅ — vfs-free `compile`/`load` of literate tjs components.
2. **Component model** — `defineComponent` over a tosijs `Component`, with
   tjs-typed state and props (examples become prop validation), CSS-variable
   styling, and element-creator views.
3. **Reactive binding** — lean on tosijs `xin`/`observe`/`touch`; expose the
   minimal b8r-style binding sugar on top.
4. **Hydration** — adopt existing server-rendered HTML instead of replacing it.
5. **Live editor** — port b8r's component editor onto the compiler: edit a
   component's tjs source, see it (and its inline tests) run live, with no vfs.
6. **Untrusted components** — load community components through AJS.

[b8r]: https://github.com/tonioloewald/bindinator.js
[tosijs]: https://tosijs.net
[tjs]: https://tjs-platform.web.app
