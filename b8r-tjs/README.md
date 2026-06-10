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
const mod = await import('data:text/javascript,' + encodeURIComponent(code))
```

No file is written, no service worker registered. `src/compile.tjs` implements
this and `test/compile.test.mjs` proves it round-trips — including that a
wrong-typed call into the loaded module returns a `MonadicError`.

## Status

Early, and authored **in tjs** (built to `dist/` via `tjs`, no TypeScript step).
Verified today:

- `src/compile.tjs` — the vfs-free literate component compiler (`compile` /
  `toModuleUrl` / `load`).
- `src/observe.tjs` — path-observed state: `register` / `get` / `set` / `observe`
  / `touch`. Stable by default; bindings wire to it.
- `build.mjs` — transpiles `src/**/*.tjs` → `dist/**/*.js`.

## Layout

```
b8r-tjs/
  src/        framework source, authored in .tjs
  examples/   literate example components (target authoring model)
  test/       Node tests run against built dist/
  build.mjs   .tjs -> .js transpiler (single pass via tjs)
  dist/       build output (gitignored)
```

## Commands

```bash
npm install      # tjs-lang (the only dependency)
npm run build    # transpile src/**/*.tjs -> dist/
npm test         # build, then run Node tests against dist/
```

## Roadmap

1. **Compiler** ✅ — vfs-free `compile`/`load` of literate tjs components.
2. **Observed state** ✅ — path observers; stable by default.
3. **Element creator + CSS variables** — port tosijs's `elements`/`css`/`vars`
   ideas into tjs (no HTML/CSS slabs). Renderer runs **headless in Node** so it
   can both unit-test without a browser and pre-render HTML (see #5).
4. **Component model** — a redefinable definition registry (not custom
   elements): tjs-typed state (examples become validation), element-creator
   views, bindings as wiring, instances re-rendered when a definition is swapped.
5. **Static generation + hydration** — render component definitions to static
   HTML at build time (the same literate sources that define the doc examples),
   ship that markup plus a hydrating `<script>` that **adopts** the existing DOM
   and wires bindings to it. Content paints before JS → SEO + fast TTFI; the
   "no HTML slabs" rule means the static markup is generated, never maintained.
6. **Performance cutouts** — if profiling demands it, make the binding-apply
   layer an explicit unsafe (`!`) fast path and batch DOM writes. Off by default.
7. **Live editor** — the payoff loop: edit a component's tjs source → `compile()`
   → install the new definition → live instances update, no vfs, no reload.
8. **Untrusted components** — load community components through AJS.

[b8r]: https://github.com/tonioloewald/bindinator.js
[tosijs]: https://tosijs.net
[tjs]: https://tjs-platform.web.app
