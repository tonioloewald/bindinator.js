# b8r-tjs — triage & migration plan

Where the codebase stands after the tosijs rebase, and what to dispose / migrate /
keep. The goal: ship a lean, tree-shakeable **b8r → tosijs** compatibility layer +
loaders, drop the primitives tosijs already provides, and keep b8r-tjs's genuinely
novel half (literate compile / live-edit / AJS sandbox / SSG+hydrate).

Status: **Pass A landed; direction decided (see "Decided" at the end — read that
first, it is the north star).** Pass B is the real migration and is now unblocked.

## The shape of `src/` today — two disconnected clusters

The import graph splits cleanly in two; the halves don't reference each other, so
removing Cluster A cannot break Cluster B.

- **Cluster A — pre-rebase pure-tjs primitives**
  `index.tjs` (barrel) → `observe.tjs`, `elements.tjs`, `css.tjs`, `component.tjs`;
  plus the novel `live.tjs` → (`compile`, `component`, `css`, `elements`),
  `untrusted.tjs` → (`component`, `tjs-lang`), `compile.tjs` → `tjs-lang`.
- **Cluster B — the tosijs rebase (the active path)**
  `b8r-compat.js` → `tosijs`; `b8r-elements.js`; `b8r-blueprint.js` →
  (`b8r-compat`, `b8r-elements`, `tosijs`); `b8r-component.tjs` →
  (`b8r-compat`, `tosijs`); `b8r-example.js` → (`b8r-blueprint`, `b8r-compat`).
  All **tosijs-only** — no `tosijs-ui` runtime dependency.

## Triage

| Piece | Verdict | Why / blocker |
|---|---|---|
| `b8r-compat.js` | **Keep** | The adapter (bindings, events, lists, interpolation). |
| `b8r-elements.js` | **Keep** | Ported b8r `elements` creator (no b8r dep). |
| `b8r-blueprint.js` | **Keep** | Modern (ESM-object) component loader, redefinable. |
| `b8r-component.tjs` | **Keep** | Legacy `.component.html` loader. |
| `b8r-example.js` | **Keep** | `<live-example>` / doc-browser bridge. |
| `compile.tjs` | **Keep (novel)** | The vfs-free literate loader — crown jewel. `tjs-lang` only. |
| `live.tjs` | **Keep, but migrate** | Live-edit loop. Currently imports the *old* `component`/`css`/`elements`; re-point at the blueprint loader + tosijs. |
| `untrusted.tjs` | **Keep, but migrate** | AJS sandbox (`defineUntrusted`/`runHandler`). Imports old `component`; make standalone or re-point at blueprint. |
| `observe.tjs` | **Dispose** | = tosijs `xin`/`boxed`/`observe`/`touch`. |
| `elements.tjs` | **Dispose** | = tosijs `elements` (+ `b8r-elements` for b8r style). |
| `css.tjs` | **Dispose** | = tosijs `css`/`vars`. |
| `component.tjs` | **Dispose** | Redefinable registry → blueprint loader; hydration → `hydrateB8r`. `renderToString` goes with it — decided, not rehomed (see "Decided"). |
| `index.tjs` (barrel) | **Rewrite** | Today it exports only Cluster A. Re-point at the kept surface (see tree-shaking). |
| `lib/exemplar.js` (parent b8r repo) | **Dispose** | "Gradual typing by example" — exactly what tjs-lang's example-types do natively. No b8r-tjs dependency; parent-repo cleanup for when b8r-tjs supersedes b8r. |

## Tree-shakeability

**DONE (Pass A).** `package.json` had no `exports` map and no `sideEffects` flag, so
the package was opaque to bundlers. What landed:

1. **`sideEffects` is an ARRAY, not `false`.** The blanket `false` this plan
   originally called for would have been wrong — two modules do real work at
   import, and a bundler is entitled to drop them:
   - `component.js` — `register('_c', {})` at module scope seeds the root that
     holds every instance's private state. (State init is *not* lazy here; there
     is no `ensureRoot`.)
   - `b8r-component.js` — `setLegacyComponentLoader(…)` at module scope. This
     registration **is the opt-in**: importing the module is what makes
     `<b8r-component path="components/hello">` resolve extensionless legacy
     paths. Tree-shake it and declarative legacy loading silently stops working.

   Everything else is genuinely side-effect-free at load (CSS injects at *mount*,
   `b8r-elements` caches lazily), so only those two are listed.
2. **Granular `exports` map**, so a consumer who wants only the b8r→tosijs adapter
   doesn't drag in `tjs-lang`/the AJS VM. Verified by walking the transitive
   import graph of each entry in `dist/`:

   | subpath | modules | tjs-lang | tosijs |
   | --- | --- | --- | --- |
   | `.` (native authoring) | 5 | no | no |
   | `./b8r`, `./compat`, `./blueprint`, `./component`, `./targets-extra`, `./example` | 1–4 | **no** | yes |
   | `./elements` | 1 | no | no |
   | `./compile`, `./live`, `./untrusted` | 1–6 | yes | **no** |

3. **`./b8r` is the new compat barrel** — blueprint + compat + elements in one
   import. Deliberately excludes `./component` (import-time side effect),
   `./targets-extra` and `./example` (opt-in by design), so none of those get
   forced on a consumer who just wants the adapter.
4. **`tosijs` moved to `peerDependencies`** (optional, plus a devDependency).
   Its registry (`xin`/`boxed`) is a module singleton, so a consumer with its own
   copy would otherwise get two registries and bindings that silently never see
   each other's state. Consumers import `Component`/`makeComponent`/`elements`
   straight from `tosijs`; b8r-tjs re-exports none of it.
5. *(Lower priority, not done)* `b8r-compat.js` is ~430 lines (bindings + events +
   lists + interpolation) — one cohesive unit; only split if someone wants
   events-without-lists.

## Sequencing

**Pass A — non-destructive — ✅ DONE**
1. ~~Add `sideEffects: false` + a granular `exports` map.~~ Done, with
   `sideEffects` as an array — see Tree-shakeability above for why `false` was
   unsafe.
2. ~~Split/rewrite the barrel so tosijs-only and tjs-lang-pulling surfaces are
   separate.~~ Done via the `exports` map + the new `./b8r` barrel. Nothing
   deleted; Cluster A still builds and `.` still resolves to it. Also moved
   `tosijs` to an optional peer dependency.

Note for Pass B: `.` currently resolves to the **native** authoring barrel. If
Cluster A is deleted, `.` has to be repointed (`./b8r` is the obvious target) —
that is a breaking change to the default entry, so do it deliberately rather
than as a side effect of the deletions.

**Pass B — the migration (the real decisions)**
3. Migrate `live.tjs` + `untrusted.tjs` off `component.tjs` onto the blueprint
   loader + tosijs.
4. ~~Rehome `renderToString`/SSG onto a `b8r-elements` + `hydrateB8r` renderer.~~
   **Cancelled** — `renderToString` is deleted with the rest, not rehomed. No b8r
   user has it today (classic b8r has `bindAll`, i.e. hydrate authored HTML, which
   `hydrateB8r` already provides). Re-filed as a possible future *feature*; see
   "Note kept" below.
5. Delete `observe.tjs`, `elements.tjs`, `css.tjs`, `component.tjs`.
6. Retire/port the Cluster-A tests (`component.test`, `ssg-hydrate.test`,
   `live-edit.test`; `compile.test` stays).
7. (Separate) remove `lib/exemplar.*` from the parent repo when b8r-tjs supersedes b8r.

## Decided (2026-08-18)

**Drop the second component API.** `component.tjs` + `observe`/`elements`/`css`
go; b8r-tjs is purely a compatibility + loader layer over tosijs, and
`compile`/`live`/`untrusted` get re-pointed at `defineB8rComponent`.

Why, in the owner's words: *"I'd prefer not to support b8rjs in perpetuity and
basically zero in on a tjs-powered tosijs as our end goal."*

That is the north star, and it settles more than this one question:

- **b8r compatibility is a bridge, not a destination.** Its job is to carry
  existing b8r components and their authors onto tosijs. It is not a surface to
  grow features on, and b8rjs itself is not supported forever.
- **tosijs (powered by tjs) is the destination.** Anything that would be a
  *third* way to author a component works against that, which is exactly what
  `component.tjs` was — an API b8r-tjs invented, competing with both the thing
  we are migrating from and the thing we are migrating to.
- So when a change could land in the compat layer or upstream in tosijs,
  **prefer upstream.**

### Note kept: `renderToString` / static pre-rendering

The one capability only the dropped model had. Worth recording rather than
losing:

- It baked bound state into markup (`<span data-bind="text:count">3</span>`) and
  `hydrate` then adopted that DOM in place instead of rebuilding it. Tests
  `ssg-hydrate.test.ts` and `demo/hydrate.html` show it working.
- **No b8r user is losing anything.** Classic b8r has no `renderToString` at all
  — it has `b8r.bindAll(element)`, i.e. hydrate *authored* HTML, and the compat
  layer's `hydrateB8r` already does that. Static pre-rendering would have been a
  new capability for them, not a restored one.
- So it is deleted as a *migration* obligation and re-filed as a possible
  *feature*: if static rendering is wanted later, build it on `b8r-elements` +
  `hydrateB8r` (or better, upstream in tosijs) rather than reviving a second
  component model to get it.

### The one open design question in the re-point

`live.tjs` is mechanical — inject b8r primitives as `lib`, call
`defineB8rComponent`. But the editable source contract changes: today the
factory returns a native spec (`{ name, state, methods, view }`); it would
return a b8r spec (`{ css, view, initialValue, … }`).

`untrusted.tjs` is the real one. `defineUntrusted` maps AJS handler sources to
`methods[name](ctx, event)` closures using `ctx.snapshot()` / `ctx.set()`. The
b8r model has **no `methods` concept** — event handlers are `data-event` strings
resolving to paths in the instance scope, and functions live *inside* the state
object returned by `initialValue`. So the AJS sandbox needs a decision about how
handlers attach: most likely as functions seeded into `initialValue`'s object and
referenced as `_component_.<name>`, with the fuel-metered `runHandler` call
inside. Settle that before writing it.

