# b8r-tjs

> A literate UI framework that is **type-safe at runtime**, **stable by default**,
> and has **no `vfs`**. It takes the deep lessons of [bindinator (b8r)][b8r] and
> [tosijs][tosijs] and transcends both, expressed in the [tjs][tjs] language.

## Where this comes from

b8r proved a UI framework could be tiny, dependency-free, and *literate* —
components and tests living next to their docs, editable live in the browser. But
it paid for that liveness with hacks: it `eval`'d untyped component scripts, and
its in-browser editor wrote reconstructed components to a **service-worker
virtual file system** (`vfs`) just so the module loader would accept them.

tosijs was meant to be the clean successor — and its *primitives* are excellent —
but it gave two things away. Going all-in on TypeScript means the types evaporate
at runtime. And building components on **native custom elements** means a
component's definition is locked the moment `customElements.define` runs: you
cannot *redefine* it. b8r does light DOM (and could do shadow), but the thing
that matters is that b8r **owns its component registry** — one definition, reused
by every instance — so swapping that definition at runtime is trivial. That is
the whole basis for hot reload and live editing, and custom-element frameworks
structurally can't do it.

`b8r-tjs` is not a successor to either. It's a deliberate divergence that keeps
what each got right and drops what each got wrong:

- from **tosijs** — the *ideas* behind its primitives, **ported into tjs** (not
  imported from a TypeScript package): a state-observer proxy, an element creator
  so component files carry no slabs of HTML, and first-class CSS variables so
  they carry no slabs of CSS;
- from **b8r** — the **owned, redefinable component registry** (one definition
  reused by every instance, swappable at runtime → hot reload, live editing) and
  its literate, edit-it-live ergonomics, light DOM by default (existing HTML
  still **hydrates** — you opt into the element creator, never forced into it);
- from **tjs** — a language whose *types are examples that survive to runtime* as
  contracts, docs, and tests, transpiling to plain JS with validation injected,
  in one pass, in the browser, no build step. Errors are returned (monadic), not
  thrown. Its sibling **AJS** is a gas-metered VM for running *untrusted* code.

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
  do. Setting a path to the value it already holds notifies no one. Mutating an
  object in place notifies no one until you `touch` its path — by design.

So you will not find the word "reactive" here, and view code is never written as a
pure function of state.

## Components are redefinable definitions, not custom elements

A b8r-tjs component is a *definition* held in a registry under a name; instances
render from whatever definition currently sits under that name. b8r-tjs does
**not** wrap components in native custom elements, because `customElements`
definitions are immutable once registered — and immutability there forecloses the
single most valuable thing a literate framework can do.

Because the definition is owned and mutable:

- **Redefining a component is trivial** — swap the definition, re-render its live
  instances. No `customElements.define` one-shot, no page reload.
- **Hot reload and live editing fall out for free.** This is the loop that
  justifies the project: edit a component's tjs source → `compile()` it
  in-process → install the new definition → every mounted instance updates. No
  `vfs`, no bundler, and the new code is type-checked on the way in.

Shadow DOM is available when you want encapsulation, but it is opt-in, not the
model.

## Direction: rebasing on tosijs (in progress)

The pure-tjs primitives below (`observe`/`elements`/`css`/`component`) proved the
model end to end — but reimplementing all of tosijs, and especially the ~50
mobile-ready components in **tosijs-ui** (`doc-browser`, `live-example`,
`side-nav`, `data-table`…), is wheel-reinvention. So the plan is to **build on
tosijs + tosijs-ui** and keep b8r-tjs's genuinely novel half — the **tjs compile
/ live-edit / AJS sandbox / SSG+hydration** layer — plus a **b8r→tosijs
compatibility adapter**. (tosijs's own migration to tjs is already in the tjs test
suite, so the core gets runtime types over time regardless.)

The first piece of that adapter ships now: `src/b8r-compat.tjs` runs legacy b8r
`data-bind` / `data-event` markup on the tosijs binding engine.

## Safe by default, fast where it counts

Every typed boundary is validated at runtime. That is the default, and it is the
whole reason b8r-tjs can run edited — eventually *untrusted* — component code
without flinching. Validation is not free, but "bindings are wiring" already
removes the expensive part (there is no VDOM diff), so the only cost left is
per-apply type checks.

If and when profiling shows the DOM-apply inner loop is hot, tjs lets us cut it
without giving up the rule: a `!`-marked function skips validation, and a whole
module can opt out via `safety none` / `TjsCompat`. The plan is therefore: keep
authoring and public APIs safe; turn *only* the binding-apply layer into an
explicit, well-tested unsafe cutout, and batch/coalesce DOM writes (an async
update queue) so we touch the DOM as little as possible. The fast path is a
fenced exception, never the default.

## What tjs makes first-class (the hacks b8r faked)

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
const mod = await import('data:text/javascript;base64,' + base64(code))
```

No file is written, no service worker registered. `src/compile.tjs` implements
this and `test/compile.test.ts` proves it round-trips — including that a
wrong-typed call into the loaded module returns a `MonadicError`. (We base64-
encode the `data:` URL rather than percent-encode it: it is UTF-8 safe and bun's
data: loader classifies it as ESM correctly even when tjs emits `fn.__tjs = {…}`
metadata on an exported binding.)

## Status

Early, and authored **in tjs** (built to `dist/` via `tjs`, no TypeScript step).
Verified today:

- `src/compile.tjs` — the vfs-free literate compiler (`compile` / `toModuleUrl`
  / `load`).
- `src/observe.tjs` — path-observed state: `register` / `get` / `set` / `observe`
  / `touch`. Stable by default; bindings wire to it.
- `src/elements.tjs` — the element creator (`elements.div(...)`): children, props,
  `style`, `onEvent` handlers, and `bind*` wiring markers. No HTML slabs.
- `src/css.tjs` — `css(...)` and `vars`: styles as data, keyed off CSS variables.
- `src/component.tjs` — the **redefinable definition registry**
  (`defineComponent` / `mount` / `renderToString` / `hydrate`). Wiring is
  declarative and serializable: views declare `bindText`/`onClick`, recorded as
  `data-bind`/`data-event` attributes; events are **named methods**. So a
  definition renders to static HTML and that markup hydrates in place.
- `src/live.tjs` — the live-editing loop (`applyEdit`): compile editable source (a
  `(lib) => spec` factory) in-process and redefine, hot-reloading live instances.
- `src/untrusted.tjs` — `defineUntrusted`: component handlers as AJS source, run
  fuel-metered and capability-isolated in tjs's `AgentVM`.
- `src/b8r-compat.tjs` — **b8r → tosijs adapter**: hydrates legacy b8r
  `data-bind`/`data-event` markup onto the tosijs binding engine (`bind`/`on`/
  `xin`), the first piece of the rebase.
- `src/b8r-component.tjs` — **legacy `.component.html` loader**: runs a real b8r
  component (markup + `data-bind` + `<script>`) on tosijs, with `_component_`
  paths scoped per instance and a b8r-style script context (`get`/`set`/`findOne`…).
- `src/index.tjs` — the authoring barrel.

Proven headlessly (bun + linkedom):
- `test/component.test.ts` — two independent instances, surgical wiring updates,
  and **redefine → both live instances re-render from the new view, each keeping
  its own state** (hot reload, no browser, no vfs).
- `test/ssg-hydrate.test.ts` — `renderToString` bakes content + wiring attributes
  into static markup, and `hydrate` **adopts** that server DOM in place (the same
  nodes survive) and wires it to live state.
- `test/live-edit.test.ts` — mount → edit source text → compile → redefine →
  the live instance updates to the new view with state preserved (the payoff loop).
- `test/untrusted.test.ts` — an AJS handler drives the UI from inside the sandbox;
  the host is unreachable; a starved handler is contained by fuel.
- `test/b8r-compat.test.ts` — legacy b8r `data-bind`/`data-event` markup
  (text/value/checked/attr/style/class/showIf + events) driven by tosijs.
- `test/b8r-component.test.ts` — a synthetic legacy component **and a real repo
  file** (`components/input.component.html`) loaded and bound on tosijs.

## Layout

```
b8r-tjs/
  src/                framework source, authored in .tjs
  examples/           literate example components (target authoring model)
  test/               bun:test files, importing .tjs directly (no build)
  tjs-bun-plugin.ts   bun loader for .tjs (preloaded via bunfig.toml)
  bunfig.toml         bun config (preloads the plugin)
  build.mjs           .tjs -> dist transpiler + inline/signature test gate
  dist/               distributable build output (gitignored)
```

## Commands

Tooling is **bun-first** — the tjs toolchain is built to integrate with bun, and
tjs does true TypeScript transpilation, so `.tjs` (and `.ts`) just work with no
config beyond a one-line plugin. A `bunfig.toml` preloads `tjs-bun-plugin.ts`, so
`.tjs` files are imported directly (transpiled with runtime validation) — **no
build step for development or tests.**

```bash
bun install      # tjs-lang (the only dependency)
bun test         # run inline + signature tests (build) then integration tests
bun run build    # produce distributable JS in dist/ (also gates inline tests)
```

`bun test` imports `.tjs` straight from `src/` via the plugin. `bun run build`
(`build.mjs`) transpiles `src/**/*.tjs` → `dist/`, running every inline `test`
block and return-example signature test and failing on any failure.

## Roadmap

1. **Compiler** ✅ — vfs-free `compile`/`load` of literate tjs components.
2. **Observed state** ✅ — path observers; stable by default.
3. **Element creator + CSS variables** ✅ — `elements`/`css`/`vars` ported into
   tjs (no HTML/CSS slabs); renders headless under bun/linkedom.
4. **Component model** ✅ — a redefinable definition registry (not custom
   elements): element-creator views, bindings as wiring, instances re-rendered
   (state preserved) when a definition is swapped.
5. **Static generation + hydration** ✅ — `renderToString` bakes content +
   `data-bind`/`data-event` wiring into static HTML (SEO + TTFI); `hydrate`
   adopts that server DOM in place and wires it. (Next: a build step that emits
   pages from the literate sources + a delegated, root-level event listener.)
6. **Performance cutouts** ✅ — profiled (`docs/perf.md`): the default validated
   path does ~0.9M `set`/sec, so shipped `batch()` (opt-in burst coalescing,
   ~1000× fewer callbacks) and deliberately did **not** add the unsafe
   validation-skip — the profile doesn't justify it. Off by default, by design.
7. **Live editor** ✅ — the payoff loop, closed (`src/live.tjs`, `applyEdit`):
   edit a component's tjs source → compile in-process → redefine → live instances
   update with state preserved, no vfs, no reload. Type errors / failing inline
   tests in the edited source are caught at compile time.
8. **Untrusted components** ✅ — `defineUntrusted` (`src/untrusted.tjs`) runs a
   component's handlers as AJS source in tjs's gas-metered VM: fuel-limited (no
   infinite loops) and capability-isolated (no DOM/network/globals). A handler is
   a pure `({ state, event }) → newState` transform; it can change its own state
   and nothing else.

[b8r]: https://github.com/tonioloewald/bindinator.js
[tosijs]: https://tosijs.net
[tjs]: https://tjs-platform.web.app
