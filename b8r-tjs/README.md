# b8r-tjs

> **DRAFT POSITIONING — the framing below was rewritten when the project's goal
> changed; the words are a starting point, not settled. Everything after
> "Not reactive" is factual and current.**

> A **b8r → tosijs compatibility layer and loader**, authored in [tjs][tjs].
> It runs existing [bindinator (b8r)][b8r] components — unmodified — on
> [tosijs][tosijs]'s binding engine, so a b8r codebase can move without being
> rewritten. It is **type-safe at runtime**, **stable by default**, and has
> **no `vfs`**.

## Where this comes from

b8r proved a UI framework could be tiny, dependency-free, and *literate* —
components and tests living next to their docs, editable live in the browser. But
it paid for that liveness with hacks: it `eval`'d untyped component scripts, and
its in-browser editor wrote reconstructed components to a **service-worker
virtual file system** (`vfs`) just so the module loader would accept them.

tosijs is where that work continues, and — with tjs — where it is going. b8r-tjs
exists to get b8r's users and their components *there*:

- from **b8r** — the component model itself (`{ css, view, load, initialValue }`,
  `data-bind` / `data-event` markup, light DOM, hydration of authored HTML) and
  the **owned, redefinable registry** that makes hot reload and live editing
  possible at all;
- from **tosijs** — the binding engine, the state registry, lists (including
  windowed/virtual rendering, a real upgrade over b8r), and CSS variables. These
  are *used*, not reimplemented;
- from **tjs** — a language whose *types are examples that survive to runtime* as
  contracts, docs, and tests, transpiling to plain JS with validation injected,
  in one pass, in the browser, no build step. Errors are returned (monadic), not
  thrown. Its sibling **AJS** is a gas-metered VM for running *untrusted* code.

**This is a bridge, not a destination.** tosijs powered by tjs is the end goal;
b8r-tjs carries existing components and their authors onto it. It is deliberately
not a place to grow new framework features, and it does not add a second way to
author a component — you write b8r components, or you write tosijs, and b8r-tjs
makes the former run on the latter.

## Not "reactive" — stable by default, bindings are wiring

This is a design stance, not a detail. React popularized *view = function(state)*:
state changes, the view re-runs, a VDOM diff reconciles. That is a bad abstraction
and a misuse of functional ideas — it makes the whole view volatile to make any
part of it live.

b8r-tjs does the opposite:

- **The DOM is stable.** It is built once and persists. Nothing re-renders
  wholesale.
- **Bindings are wiring.** A binding observes a state *path*; when (and only when)
  that path actually changes, it performs the one specific update it was wired to
  do.

So you will not find the word "reactive" here, and view code is never written as a
pure function of state.

## Components are redefinable definitions, not custom elements

A component is a *definition* held in an owned registry under a name; instances
render from whatever definition currently sits under that name. b8r-tjs does
**not** wrap components in native custom elements, because `customElements`
definitions are immutable once registered — and immutability there forecloses the
single most valuable thing a literate framework can do.

(Note tosijs's own `Component` / `makeComponent` *are* custom-element based. Use
them when you want a web component; use `defineB8rComponent` when you want
redefinability.)

Because the definition is owned and mutable:

- **Redefining a component is trivial** — swap the definition, re-stamp its live
  instances. No `customElements.define` one-shot, no page reload.
- **Hot reload and live editing fall out for free.** This is the loop that
  justifies the project: edit a component's tjs source → `compile()` it
  in-process → install the new definition → every mounted instance updates. No
  `vfs`, no bundler, and the new code is type-checked on the way in.

**Hot reload preserves data, never behaviour.** Methods live in the instance's
state (b8r's convention), so a redefinition takes the *new* functions and keeps
the *old* data — otherwise editing a method body would silently do nothing. Keep
behaviour in the definition and data in state.

## What tjs makes first-class (the hacks b8r faked)

| b8r hack | b8r-tjs |
| --- | --- |
| `eval` of untyped component scripts | `tjs(source)` → JS with runtime type-validation |
| `vfs` service-worker round-trip to `import()` edited code | `blob:` (or `data:`) URL module import of the transpiled string |
| "types" by convention, checked nowhere | examples that are simultaneously types, docs, and tests |
| untrusted components ≈ impossible | AJS gas-metered sandbox |

### The vfs killer, in three lines

```js
import { tjs } from 'tjs-lang/lang'
const { code } = tjs(componentSource)                       // transpile in-process
const mod = await import(URL.createObjectURL(
  new Blob([code], { type: 'text/javascript' })))           // live ES module
```

No file is written, no service worker registered. `src/compile.tjs` implements
this and `test/compile.test.ts` proves it round-trips — including that a
wrong-typed call into the loaded module returns a `MonadicError`.

`load()` prefers a `blob:` URL and falls back to `data:`, because neither works
everywhere: node's ESM loader accepts only `file`/`data`/`node` schemes, while
bun before 1.4 choked on long `data:` URLs. Details and repros in
`docs/bun-data-url-esm-bug.md`.

## Status

Authored **in tjs** (built to `dist/` via `tjs`, no TypeScript step), with
tosijs-proxy glue deliberately in plain `.js`. 100 tests pass headlessly under
bun + linkedom; the demos are browser-verified.

- `src/b8r-compat.js` — **the adapter**: hydrates b8r `data-bind`/`data-event`
  markup onto the tosijs binding engine (`bind`/`on`/`xin`), plus **`data-list`**
  → tosijs list bindings and a **`data-virtual`** attribute opting a list into
  windowed rendering.
- `src/b8r-blueprint.js` — **the modern component loader**: `defineB8rComponent`
  / `mountB8rComponent` / `hydrateB8rComponents` over an owned, redefinable
  registry. Real parent-repo components run unmodified.
- `src/b8r-elements.js` — b8r's element creator, ported (no b8r dependency).
- `src/b8r-component.tjs` — **legacy `.component.html` loader**: markup +
  `data-bind` + `<script>`, `_component_` paths scoped per instance.
- `src/b8r-targets-extra.js` — opt-in extra binding targets, tree-shakeable.
- `src/b8r-example.js` — bridge to tosijs-ui's `<live-example>` and doc-browser.
- `src/b8r.js` — the barrel (also the package's default entry).
- `src/compile.tjs` — the vfs-free literate compiler (`compile` / `load`).
- `src/live.tjs` — the live-editing loop (`applyEdit`).
- `src/untrusted.tjs` — `defineUntrusted`: handlers as AJS source, run
  fuel-metered and capability-isolated in tjs's `AgentVM`.

Proven headlessly (bun + linkedom):
- `test/real-component.test.ts` — **real components from the parent b8r repo**
  (`todo-simple.js`, `events`/`color`/`clock`/`instance-test`/`hello`
  `.component.html`) load and run **unmodified**.
- `test/live-edit.test.ts` — mount → edit source text → compile → redefine → the
  live instance updates with state preserved, and an edited method body actually
  takes effect.
- `test/untrusted.test.ts` — an AJS handler drives the UI from inside the sandbox;
  the host is unreachable; a starved handler is contained by fuel; and an
  untrusted handler cannot overwrite behaviour, only its own data.
- `test/b8r-compat.test.ts`, `test/b8r-list.test.ts`,
  `test/b8r-component.test.ts` — bindings, events, lists and the legacy loader.
- `test/dist-smoke.test.ts` — imports the built `dist/`, catching build breakage.

## Layout

```
b8r-tjs/
  src/                framework source (.tjs, plus .js for tosijs-proxy glue)
  examples/           literate example component
  test/               bun:test files, importing src directly (no build)
  demo/               browser demos (docs, live edit, hydration, lists)
  docs/               design notes + upstream bug write-ups
  tjs-bun-plugin.ts   bun loader for .tjs (preloaded via bunfig.toml)
  build.mjs           .tjs -> dist transpiler + inline/signature test gate
  dist/               distributable build output (gitignored)
```

## Commands

Tooling is **bun-first**. A `bunfig.toml` preloads `tjs-bun-plugin.ts`, so `.tjs`
files are imported directly (transpiled with runtime validation) — **no build
step for development or tests.**

```bash
bun install      # tjs-lang; tosijs is an optional PEER dependency
bun test         # inline + signature tests (build), then integration tests
bun run build    # produce distributable JS in dist/ (also gates inline tests)
bun start        # build + serve the demos
```

`tosijs` is a **peer** so a consumer's copy and this one can't diverge: its
registry is a module singleton, and two instances mean bindings that silently
never see each other's state.

## Roadmap

1. **Compiler** ✅ — vfs-free `compile`/`load` of literate tjs components.
2. **b8r compatibility** ✅ — `data-bind`/`data-event`, all binding targets,
   events, `data-list` (+ windowed `data-virtual`), interpolation.
3. **Component loaders** ✅ — modern ESM-object components and legacy
   `.component.html`, sharing one redefinable registry; declarative
   `<b8r-component>`; markup-children transclusion.
4. **Real components run unmodified** ✅ — parent-repo components load and work
   without edits; see `COMPATIBILITY.md` for the tracked divergences.
5. **Live editor** ✅ — edit a component's tjs source → compile in-process →
   redefine → live instances update with state preserved, no vfs, no reload.
6. **Untrusted components** ✅ — `defineUntrusted` runs handlers as AJS in tjs's
   gas-metered VM: fuel-limited, capability-isolated, and unable to overwrite
   behaviour.
7. **Static pre-rendering** — *not implemented, and deliberately so.* b8r has no
   `renderToString`; it hydrates authored markup (`b8r.bindAll`), which
   `hydrateB8r` provides. If baking state into HTML is ever wanted it should be
   built on `b8r-elements` + `hydrateB8r`, or upstream in tosijs — not by
   reviving a second component model.

See `MIGRATION.md` for the disposal plan and the decisions behind it.

[b8r]: https://github.com/tonioloewald/bindinator.js
[tosijs]: https://tosijs.net
[tjs]: https://tjs-platform.web.app
