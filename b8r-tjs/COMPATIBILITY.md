# b8r-tjs — compatibility & known breakage

Tracking where **b8r-tjs diverges from b8r** (running b8r markup/components on the
tosijs engine). Some divergences are deliberate (tosijs has a better model); some
are not-yet-implemented; some are hard limits of the rebase. The adapter emits a
runtime `console.warn` for the deprecated patterns it can detect.

Legend: **[deliberate]** we won't change it · **[todo]** intended, not done ·
**[limit]** a constraint of building on tosijs.

## Behavioural divergences

- **[deliberate] Asynchronous updates (no synchronous model).** b8r updated its
  registry synchronously; b8r-tjs follows tosijs (updates flush on
  `requestAnimationFrame`). Consequence: a `keydown`/`keypress` handler on a
  two-way-bound field runs *before* the field's `change`, so a value-mutating
  handler can read a stale value or have its write reverted (e.g.
  `keydown(Enter):submit` that adds an item but never clears the input). **Use
  `keyup`.** *The adapter warns when it sees `keydown`/`keypress` on a two-way
  field.* (`b8r-compat.js` → `warnSyncKeydown`.)

- **[deliberate] Components are redefinable definitions, not custom elements.** A
  b8r-tjs component is a definition in an owned registry, re-stamped on redefine
  (hot reload). It is *not* a `customElements` registration, so anything depending
  on custom-element semantics (upgrade timing, `:defined`, constructor lifecycle)
  won't apply. (Design principle #3.)

- **[deliberate] No `vfs` / service-worker.** b8r's component/loader vfs hack is
  gone; modules load via real ESM (`compile.tjs` builds `data:` URLs). Anything
  relying on the vfs URL scheme won't work.

## Bindings

- **[limit] `${.relative}` interpolation inside a list row** is not wired — tosijs
  doesn't re-target a `^`-template path inside a multi-path `TakeDescriptor` per
  stamp. Use a plain `text=.field` binding, or absolute/`_component_` paths, in
  rows. (`b8r-compat.js` header.)

- **Binding targets.** Core (built-in): `text`, `value`, `checked`, `attr(x)`,
  `prop(x)`, `style(x)`, `class(x)`, `showIf[(v)]`, `hideIf[(v)]`, `enabledIf`,
  `disabledIf`. Also handled: **method bindings** (dotted target path →
  `fn(element, value)`) and **multi-target** (`text,attr(title)=path`). An unknown
  target is **skipped with a one-time `console.warn`** (gaps surface).
  - **[todo] Heavier targets not in core:** `format` (markdown), `img`/`bgImg`
    (lazy images), `bytes`, `timestamp`, `json`, `href`, `data`, `pointerEventsIf`.
    These are meant to ship as a **separate, tree-shakeable module** registered via
    `registerB8rBindings({ bindings, factories })` — only bundled when imported.
  - **[todo] Two-way (`fromDOM`):** `value` and `checked` done; `selected` and
    two-way `text` not yet.

## Components / loader

- **[todo] Legacy `<script>` bodies vs. modern modules.** `.component.html` with a
  `<script>` runs via `AsyncFunction` (trusted). b8r features the script relied on
  (`b8r.component`, `b8r.json`, ajax helpers, `b8r.register` semantics, the full
  `b8r` object) are **partially** provided — the instance context exposes
  `get/set/find/findOne/on/touch/register/component/data`; calls to unimplemented
  `b8r.*` will throw. `require` is unsupported (b8r already told users to use
  `import`).

- **[deliberate] Composition warns instead of dropping.** `makeComponent`'s
  creator slots children into the view's `[data-children]` (b8r-style
  transclusion). When a view has *no* `[data-children]` but children are passed,
  b8r dropped them silently; b8r-tjs drops them too but **`console.warn`s** (deduped
  per component) so the mistake surfaces. Composition is light-DOM `data-children`,
  not a shadow `<slot>`/`tosiSlot` (our components aren't custom elements).

- **[limit] `initialValue` / `component.data`.** Provided and reactive
  (`component.data` reads the live instance proxy). Edge cases around b8r's exact
  `data` cloning / `get('path.to.deep')` string-path semantics may differ from b8r.

## How we track it

1. This file — update it whenever we hit or fix a divergence.
2. Runtime `console.warn`s for detectable deprecated patterns (start: sync
   `keydown`). Add more as we find them (e.g. unknown bind target, unimplemented
   `b8r.*`), so breakage surfaces in the console instead of failing silently.
3. Tests that assert the warnings fire (`test/b8r-events.test.ts`).
