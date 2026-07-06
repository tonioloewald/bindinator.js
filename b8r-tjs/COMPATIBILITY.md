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
  `fn(element, value)`, and the explicit `method(path.to.fn)=path` form),
  **multi-target** (`text,attr(title)=path`), and **snake_case names** camelized
  exactly as b8r does (`show_if` → `showIf`). An unknown target is **skipped with
  a one-time `console.warn`** (gaps surface).
  - **`{{mustache}}` is not interpolation** — never was in b8r either (real
    components use it aspirationally; b8r bound the whole string as a bogus path
    and silently emptied the element). b8r-tjs **warns and skips** the binding so
    static content survives. Use `${path}`.
  - **Heavier / rarer targets ship separately (opt-in):** `src/b8r-targets-extra.js`
    provides `format` (markdown), `img`/`bgImg` (lazy images), `bytes`,
    `timestamp`, `json`, `href`, `pointerEventsIf`, and `data(key)` — registered via
    `registerExtraB8rTargets()` (a wrapper over `registerB8rBindings`). Kept out of
    core so it's only bundled when imported. (`pointerEventsUnless` appears in
    b8r's docs but was never implemented there — not ported.)
  - **Two-way (`fromDOM`):** `value`, `checked`, `selected` done; two-way `text`
    (contenteditable) **[todo]** — deferred because making `text` two-way would mark
    every text-bound element two-way and over-trigger the sync-`keydown` warning.

## Components / loader

- **`_data_` scope** works in both loaders: `_data_.x` resolves to the mount
  target's `data-path` attribute (b8r's inherited-data convention), falling back
  to the instance's private scope — b8r's exact rule. (b8r resolved these at
  insertion time, not dynamically; so do we.)

- **Declarative instantiation** works: `hydrateB8rComponents(root)` mounts
  `<b8r-component name="…">`, `<b8r-component path="…">` (dynamic import of the
  ESM-object form; name defaults to the filename), and `[data-component]`
  elements. Undefined names stay **pending** and mount when `defineB8rComponent`
  lands (markup may precede its components, as in b8r). **[limit]** `path` must
  point at a modern ESM component — a legacy `.component.html` path is not
  auto-fetched (load those via `loadB8rComponent` in `b8r-component.tjs`).
  Declared components inside a `data-list` template are skipped (rows stamp their
  own content).

- **[todo] Legacy `<script>` bodies vs. modern modules.** `.component.html` with a
  `<script>` runs via `AsyncFunction` (trusted). b8r features the script relied on
  (`b8r.component`, `b8r.json`, ajax helpers, the full `b8r` object) are
  **partially** provided — the instance context exposes
  `get/set/find/findOne/on/touch/register/component/data` + `getListInstance`.
  **The two get/set scopes match real b8r:** bare `get`/`set` are
  component-scoped; `b8r.get`/`b8r.set` take **absolute registry paths**
  (`b8r.set('example4.clicks', …)`). `b8r.trigger(type, element)` synthesizes a
  bubbling native event at the element. Calls to *other* unimplemented `b8r.*`
  (`component`/`insertComponent`, `call`/`callMethod`, `getComponentData`,
  list-mutation helpers) will throw. `require` is unsupported (use `import`).

- **Relative dynamic imports in legacy scripts** work via
  `loadB8rComponent(source, { base })`: pass the component's original URL and its
  `<script>`'s `import('../lib/color.js')` calls resolve against it (they're
  rewritten to a resolving helper, since `AsyncFunction` bodies have no module
  base URL). Without `base`, relative specifiers can't resolve — port the
  component to the ESM-object form, or pass `base`.

## Findings from running REAL parent-repo components (test/real-component.test.ts)

- `components/todo-simple.js` (modern form) runs **unmodified**: view builder,
  `dataList` without an idPath, relative row `text=.text`, two-way value,
  `enabledIf`, `component.data` destructuring, `+= 1` on the instance proxy, and
  push-reconciliation all work. Two warnings fire, both correct: its
  `onKeydown(Enter)` is the deprecated sync pattern (Enter adds but can't clear
  the field — use keyup), and its `{{…}}` button label was never real b8r.
- `components/events.component.html` (legacy form) runs **unmodified**:
  `b8r.register`, absolute-path `b8r.get`/`b8r.set`, `${path}` interpolation, and
  `show_if` all work.
- `components/color.component.html` runs **unmodified** (given
  `{ base: <component url> }`): the `method(_component_.fn)` target form,
  `input,change` multi-type events, relative dynamic import of `../lib/color.js`,
  the `set({…})` object form, and `b8r.trigger` all work.
- `components/clock.component.html` runs **unmodified** (given `base`): relative
  import of `../lib/dom-timers.js`, `domInterval` driving `set('time', …)` → a
  live text binding.
- `components/instance-test.component.html` + `hello.component.html` (b8r's own
  composition demo) run **unmodified**: four nested
  `<b8r-component path="components/hello">` instances with markup-children
  transclusion, per-instance `data-greeting`, private scopes via `register({…})`,
  the `format` target (extras), `show_if`, and legacy-path declarative loading.
  What this exercise added:
  - **Component boundaries in hydration** — `hydrateB8r` no longer crosses into a
    nested component's subtree (b8r's rule); without this a parent re-bound an
    already-stamped child's internals against the parent's scope.
  - **A shared registry across both loaders** — `defineLegacyComponent(name,
    source, options)` registers a legacy component in the blueprint registry
    (via `defineExternalComponent`), so declarative markup, pending, and
    legacy/modern composition work uniformly. Importing `b8r-component`
    additionally enables legacy paths in `<b8r-component path=…>` (extensionless
    → `.component.html`, fetched on demand); `setComponentPathBase(url)` is the
    page-equivalent base for those paths.
  - **Markup-children transclusion in both loaders** (declarative
    `<b8r-component>…children…</b8r-component>` → `[data-children]`), and
    single-object `register({…})` in component scripts seeding the instance's
    private scope (b8r's component-context semantics).

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
