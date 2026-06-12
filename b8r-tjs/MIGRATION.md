# b8r-tjs — triage & migration plan

Where the codebase stands after the tosijs rebase, and what to dispose / migrate /
keep. The goal: ship a lean, tree-shakeable **b8r → tosijs** compatibility layer +
loaders, drop the primitives tosijs already provides, and keep b8r-tjs's genuinely
novel half (literate compile / live-edit / AJS sandbox / SSG+hydrate).

Status: **plan only — nothing destructive done yet.** Pass A is safe to land now;
Pass B is the real migration.

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
| `component.tjs` | **Dispose, after rehoming SSG** | Redefinable registry → blueprint loader; hydration → `hydrateB8r`. Its `renderToString` (SSG, design principle #6) needs a home first — a small renderer over `b8r-elements` + `hydrateB8r`. |
| `index.tjs` (barrel) | **Rewrite** | Today it exports only Cluster A. Re-point at the kept surface (see tree-shaking). |
| `lib/exemplar.js` (parent b8r repo) | **Dispose** | "Gradual typing by example" — exactly what tjs-lang's example-types do natively. No b8r-tjs dependency; parent-repo cleanup for when b8r-tjs supersedes b8r. |

## Tree-shakeability

`package.json` currently has **no `exports` map and no `sideEffects` flag**, so the
package is opaque to bundlers. Actions:

1. **`"sideEffects": false`.** The kept modules are side-effect-free at load: state
   init is lazy (`ensureRoot`), CSS injects at *mount*, `b8r-elements` caches
   lazily. Safe to assert (re-verify after the barrel rewrite).
2. **Granular `exports` map** so a consumer who wants only the b8r→tosijs adapter
   doesn't drag in `tjs-lang`/the AJS VM:
   - `./compat`, `./blueprint`, `./component`, `./example` — tosijs-only, cheap.
   - `./compile`, `./live`, `./untrusted` — the `tjs-lang`-pulling modules, isolated
     behind their own subpaths.
3. **Split the barrel** along that same line; the default entry must not force-import
   the AJS VM.
4. *(Lower priority)* `b8r-compat.js` is ~430 lines (bindings + events + lists +
   interpolation) — one cohesive unit; only split if someone wants
   events-without-lists.

## Sequencing

**Pass A — non-destructive, land now**
1. Add `sideEffects: false` + a granular `exports` map.
2. Split/rewrite the barrel so tosijs-only and tjs-lang-pulling surfaces are
   separate. (No deletions; Cluster A still builds.)

**Pass B — the migration (the real decisions)**
3. Migrate `live.tjs` + `untrusted.tjs` off `component.tjs` onto the blueprint
   loader + tosijs.
4. Rehome `renderToString`/SSG onto a `b8r-elements` + `hydrateB8r` renderer.
5. Delete `observe.tjs`, `elements.tjs`, `css.tjs`, `component.tjs`.
6. Retire/port the Cluster-A tests (`component.test`, `ssg-hydrate.test`,
   `live-edit.test`; `compile.test` stays).
7. (Separate) remove `lib/exemplar.*` from the parent repo when b8r-tjs supersedes b8r.

## Open question
Whether b8r-tjs keeps a "native authoring" surface at all (its own
`observe`/`elements`/`css`/`component`) or is *purely* a compatibility +
loader layer on top of tosijs. The rebase decision points at the latter — in which
case Cluster A goes entirely except the novel `compile`/`live`/`untrusted`, which
get re-pointed at tosijs.
