/*#
## b8r-tjs · b8r component blueprint loader

Loads a **modern b8r component** — the ESM-module form whose default export is an
object — onto the tosijs engine, the b8r analogue of tosijs's blueprint loader.
A component is `{ css?, html?, view?, load?, initialValue?, type? }`:

    export default {
      css: '._component_ button { color: var(--accent); }',
      view: ({ div, button }) => div(
        button('Add', { onClick: '_component_.add', bindEnabledIf: '_component_.text' })
      ),
      initialValue: ({ component }) => ({ text: '', add () { component.data.text = '' } }),
      load: async ({ get, set, findOne }) => { … }   // one-time wiring
    }

`view(elements)` builds DOM that records bindings as `data-bind` / `data-event`
(see `b8r-elements.js`); `html` is a markup string alternative. Either way the
bindings are hydrated through the b8r→tosijs adapter with `_component_.x`
rewritten to a per-instance scope (`_b8r.<id>` in the registry) and `_data_.x`
to the mount target's `data-path` attribute (falling back to the private scope —
b8r's inherited-data rule). Markup can also ask for components **declaratively**
(`<b8r-component name="…">`, `path="…"`, or `[data-component]`) — see
`hydrateB8rComponents` below.

`css` mirrors `view`: it may be a string, a tosijs **XinStyleSheet object**, or a
**function** `({ css, vars, varDefault }) => string | XinStyleSheet`. Because these
are tosijs's *actual* CSS-variable proxies (passed straight through), the full
computed surface is available: `vars.accentColor` → `var(--accent-color)`,
`varDefault.gap('8px')` → `var(--gap, 8px)`, `vars.width50` →
`calc(var(--width) * 0.5)` (and `vars.width_50` → `* -0.5`), plus computed-color
math via the `b`/`s`/`h`/`o` suffixes.

    css: ({ vars, varDefault }) => `
      ._component_ button { color: ${vars.accentColor}; gap: ${varDefault.gap('8px')}; }
      ._component_ .bar   { width: ${vars.width50}; }
    `

`vars.width50` above resolves to `calc(var(--width) * 0.5)`.

**Components are redefinable definitions, not custom elements** (a core b8r-tjs
principle): `defineB8rComponent(name, spec)` (re)registers under `name` and
re-stamps every live instance, so editing a component hot-reloads its instances.
*/

import { tosi, xin, tosiValue, css, vars, varDefault } from 'tosijs'
import { hydrateB8r, getListInstance } from './b8r-compat.js'
import { elements, create } from './b8r-elements.js'

const AsyncFunction = (async () => {}).constructor
let nextId = 0
let rootReady = false

function ensureRoot () {
  if (rootReady) return
  tosi({ _b8r: {} })
  rootReady = true
}

// the redefinable registry: name → { spec, style, instances:Map<id,{target,data}> }
const registry = {}

// rewrite b8r scope prefixes: `_component_.x` → this instance's private scope;
// `_data_.x` → the inherited data path (the mount target's `data-path` attribute,
// b8r's convention), falling back to the private scope — exactly b8r's rule.
function scoped (scope, dataPath, path) {
  if (path.startsWith('_component_')) return scope + path.slice('_component_'.length)
  if (path.startsWith('_data_')) return (dataPath || scope) + path.slice('_data_'.length)
  return path
}

function valueAtPath (path) {
  let node = xin
  for (const part of path.split('.')) {
    if (node === null || node === undefined) return undefined
    node = node[part]
  }
  return tosiValue(node)
}

// resolve a component's `css` to a string. It may be a plain string, a tosijs
// XinStyleSheet object (run through `css()`), or — mirroring `view(elements)` — a
// function `({ css, vars, varDefault }) => string | XinStyleSheet`. `vars` /
// `varDefault` are tosijs's CSS-variable proxies: `vars.accentColor` →
// `var(--accent-color)`, `varDefault.gap('8px')` → `var(--gap, 8px)`.
function resolveCss (spec) {
  let style = spec.css
  if (typeof style === 'function') style = style({ css, vars, varDefault })
  if (style !== null && style !== undefined && typeof style === 'object') style = css(style)
  return style
}

// scope a component's CSS (`_component_` → `.<name>-component`) and (re)install
// its single stylesheet, so redefining a component swaps its CSS in place.
function installStyle (entry, name, cssText) {
  if (entry.style !== null) entry.style.remove()
  if (cssText === undefined || cssText === null || cssText === '') { entry.style = null; return }
  const className = name + '-component'
  const style = document.createElement('style')
  style.textContent = cssText.replace(/_component_/g, '.' + className)
  document.head.append(style)
  entry.style = style
}

// build a component's view subtree: a `view` builder function (passed the
// `elements` creator) or an `html` markup string. Returns an array of nodes.
function buildView (spec) {
  if (spec.view !== undefined) {
    const built = spec.view(elements)
    return Array.isArray(built) ? built : [built]
  }
  const holder = document.createElement('div')
  holder.innerHTML = spec.html === undefined ? '' : spec.html
  return [...holder.childNodes]
}

// the b8r-style instance context handed to `initialValue`, `load`, and methods.
// `component.data` always reads the live instance proxy (so methods captured at
// definition time mutate current state).
function makeContext (id, target) {
  const scope = '_b8r.' + id
  // b8r's inherited data path: carried by a `data-path` attribute on the target
  const dataPath = target.getAttribute === undefined ? null : target.getAttribute('data-path')
  const get = function (key) {
    const base = tosiValue(xin._b8r[id])
    return key === undefined ? base : base[key]
  }
  const set = function (keyOrObject, value) {
    if (keyOrObject !== null && typeof keyOrObject === 'object') {
      for (const key of Object.keys(keyOrObject)) xin._b8r[id][key] = keyOrObject[key]
    } else {
      xin._b8r[id][keyOrObject] = value
    }
  }
  const findOne = function (selector) { return target.querySelector(selector) }
  const find = function (selector) { return [...target.querySelectorAll(selector)] }
  const touch = function () {}
  const on = function (types, path) {
    for (const type of types.split(',')) {
      target.addEventListener(type.trim(), function (event) {
        const handler = valueAtPath(scoped(scope, dataPath, path))
        if (typeof handler === 'function') handler(event, target)
      })
    }
  }
  const register = function (name, object) { tosi({ [name]: object }) }
  // b8r's list-row lookup: `getListInstance(evt.target)` → the row's item proxy.
  const component = { element: target, get id () { return id }, get data () { return xin._b8r[id] } }
  const b8r = { get, set, find, findOne, on, touch, register, getListInstance }
  return { component, scope, dataPath, b8r, get, set, find, findOne, on, touch, register, getListInstance }
}

// stamp a defined component into `target` with the given starting data, wiring
// its bindings and running `load`. Reused for first mount and for hot-reload.
async function stamp (entry, name, id, target, data) {
  const ctx = makeContext(id, target)
  // seed instance state: `initialValue` (object or `({component}) => object`),
  // overlaid with any explicit `data`.
  const spec = entry.spec
  let initial = spec.initialValue
  if (typeof initial === 'function') initial = initial(ctx)
  xin._b8r[id] = Object.assign({}, initial === undefined ? {} : initial, data === undefined ? {} : data)

  // capture the target's pre-existing markup children — a declarative
  // `<b8r-component>…children…</b8r-component>` transcludes them into the
  // view's `[data-children]` (b8r's rule), same as makeComponent's arg children
  const markupChildren = [...target.childNodes]
  target.innerHTML = ''
  for (const node of buildView(spec)) target.append(node)
  if (markupChildren.length && markupChildren.some(n => n.nodeType === 1 || (n.textContent || '').trim() !== '')) {
    slotChildren(name, target, markupChildren)
  }
  hydrateB8r(target, { resolve: path => scoped(ctx.scope, ctx.dataPath, path) })

  if (typeof spec.load === 'function') {
    await spec.load(ctx)
  } else if (typeof spec.load === 'string' && spec.load !== '') {
    // legacy string `<script>` body — run with b8r's positional load signature
    const run = new AsyncFunction(
      'component', 'b8r', 'get', 'set', 'find', 'findOne', 'on', 'touch', 'data', 'register',
      spec.load
    )
    await run(ctx.component, ctx.b8r, ctx.get, ctx.set, ctx.find, ctx.findOne, ctx.on, ctx.touch, xin._b8r[id], ctx.register)
  }
  // components compose: mount any declared components in the stamped subtree
  // (including ones that arrived inside the transcluded children)
  await hydrateB8rComponents(target)
}

// Define (or redefine) a b8r component. `spec` is the component's default export
// (`{ css, html|view, load, initialValue, type }`). Redefining re-installs the
// stylesheet and re-stamps every live instance (hot reload). Returns the entry,
// whose `mount(target, data)` instantiates the component.
// Shallow copy without function-valued own properties. Used on hot-reload so a
// redefinition's methods replace the running instance's, rather than being
// shadowed by the ones preserved in its state. Shallow on purpose: b8r's
// convention is methods at the top level of the instance object.
function withoutMethods (value) {
  if (value === null || typeof value !== 'object') return value
  const out = {}
  for (const key of Object.keys(value)) {
    if (typeof value[key] !== 'function') out[key] = value[key]
  }
  return out
}

export function defineB8rComponent (name, spec) {
  ensureRoot()
  let entry = registry[name]
  if (entry === undefined) {
    entry = { spec, style: null, instances: new Map() }
    registry[name] = entry
  } else {
    entry.spec = spec
  }
  installStyle(entry, name, resolveCss(spec))

  entry.mount = async function (target, data) {
    const id = 'i' + nextId
    nextId = nextId + 1
    target.classList.add(name + '-component')
    if (target.dataset !== undefined) target.dataset.componentId = id
    entry.instances.set(id, { target, data })
    await stamp(entry, name, id, target, data)
    return id
  }

  // hot-reload: re-stamp every live instance against the new definition,
  // preserving each instance's current data (re-seeded from its proxy).
  //
  // Methods are deliberately NOT carried over. b8r keeps a component's methods
  // inside its state object, and `stamp` overlays the preserved data on top of
  // the new `initialValue` — so carrying functions across would let a stale
  // method shadow an edited one, and live-editing a method body would silently
  // do nothing. Data persists; behaviour comes from the new definition.
  for (const [id, instance] of entry.instances) {
    const current = withoutMethods(tosiValue(xin._b8r[id]))
    stamp(entry, name, id, instance.target, current)
  }
  // declarative placeholders waiting on this name mount now (b8r's rule:
  // a definition finds the elements that were already asking for it)
  const waiting = pendingComponents.get(name)
  if (waiting !== undefined) {
    pendingComponents.delete(name)
    for (const element of waiting) { if (element.dataset.componentId === undefined) entry.mount(element) }
  }
  return entry
}

// Convenience: load a component from an imported ESM module namespace
// (`await import('./foo.component.js')`), whose `default` is the spec.
export function loadB8rComponent (name, module) {
  const spec = module && module.default !== undefined ? module.default : module
  return defineB8rComponent(name, spec)
}

// Mount a previously-defined component into `target`. Throws if undefined.
export function mountB8rComponent (target, name, data) {
  const entry = registry[name]
  if (entry === undefined) throw new Error('b8r component "' + name + '" is not defined')
  return entry.mount(target, data)
}

// --- declarative instantiation: <b8r-component> / [data-component] -------------
//
// b8r markup asks for components declaratively:
//
//   <b8r-component name="counter"></b8r-component>            // from the registry
//   <b8r-component path="./counter.component.js">             // dynamic import
//   <b8r-component name="doc" data-path="app.current">        // `_data_` scope
//   <div data-component="counter"></div>                      // attribute form
//
// `hydrateB8rComponents(root)` scans and mounts. A `path` is dynamically imported
// (its default export is the spec; the name defaults to the filename). A name with
// no definition yet is left PENDING — `defineB8rComponent` mounts the waiters when
// the definition lands, matching b8r (markup can precede its components).
const pendingComponents = new Map() // name → Set<element>

function declaredName (element) {
  const name = element.getAttribute('name') || element.getAttribute('data-component')
  if (name) return name
  const path = element.getAttribute('path')
  return path === null ? null : path.split('/').pop().split('.').shift()
}

// Register a component under `name` with a CUSTOM mount function — how the
// legacy `.component.html` loader joins THIS registry, so legacy and modern
// components share declarative instantiation and the pending mechanism.
export function defineExternalComponent (name, mount) {
  ensureRoot()
  let entry = registry[name]
  if (entry === undefined) {
    entry = { spec: null, style: null, instances: new Map() }
    registry[name] = entry
  }
  entry.mount = async function (target, data) {
    if (target.dataset !== undefined) target.dataset.componentId = 'x' + (nextId = nextId + 1)
    target.classList.add(name + '-component')
    return mount(target, data)
  }
  const waiting = pendingComponents.get(name)
  if (waiting !== undefined) {
    pendingComponents.delete(name)
    for (const element of waiting) { if (element.dataset.componentId === undefined) entry.mount(element) }
  }
  return entry
}

// b8r resolved component paths against the PAGE; the module equivalent is a
// configurable base URL. Loaders auto-scan with this default; a per-call
// `{ base }` overrides it. Unset → specifiers pass through as written.
let componentPathBase
export function setComponentPathBase (url) { componentPathBase = url }

// The legacy (`.component.html`) loader registers itself here (importing
// `b8r-component.tjs` installs it); blueprint stays legacy-free when unused.
let legacyComponentLoader = null
export function setLegacyComponentLoader (loader) { legacyComponentLoader = loader }

function resolvePath (path, base) {
  const against = base === undefined ? componentPathBase : base
  return against === undefined ? path : new URL(path, against).href
}

// load-by-path: `.js`/`.mjs` → ESM import (default export is the spec);
// anything else is b8r's html form — `components/hello` means
// `components/hello.component.html` — routed to the legacy loader.
async function loadDeclaredPath (name, path, base) {
  if (/\.m?js$/.test(path)) {
    const module = await import(resolvePath(path, base))
    return loadB8rComponent(name, module)
  }
  if (legacyComponentLoader === null) {
    throw new Error(
      'b8r-tjs: component path "' + path + '" is the legacy html form — import ' +
      'b8r-component.js (the legacy loader) to enable it'
    )
  }
  const url = resolvePath(/\.component\.html$/.test(path) ? path : path + '.component.html', base)
  return legacyComponentLoader(name, url)
}

export function hydrateB8rComponents (root, options = {}) {
  ensureRoot()
  const found = [...root.querySelectorAll('b8r-component,[data-component]')]
  if (root.matches !== undefined && root.matches('b8r-component,[data-component]')) found.unshift(root)
  const mounts = []
  for (const element of found) {
    if (element.dataset.componentId !== undefined) continue          // already mounted
    if (element.closest('[data-list]') !== null) continue            // list templates stamp rows themselves
    const name = declaredName(element)
    if (name === null) continue
    const path = element.getAttribute('path')
    if (registry[name] !== undefined) {
      mounts.push(registry[name].mount(element))
    } else if (path !== null) {
      // re-check on resolution: with several same-name declarations in flight, a
      // sibling's post-mount scan may have already mounted this element
      mounts.push(loadDeclaredPath(name, path, options.base).then(
        entry => element.dataset.componentId === undefined ? entry.mount(element) : null))
    } else {
      let waiting = pendingComponents.get(name)
      if (waiting === undefined) { waiting = new Set(); pendingComponents.set(name, waiting) }
      waiting.add(element)
    }
  }
  return Promise.all(mounts)
}

// append a child part (node / string / number / array) to a parent
function appendPart (parent, part) {
  if (part === null || part === undefined) return
  if (Array.isArray(part)) { for (const p of part) appendPart(parent, p); return }
  if (typeof part === 'string' || typeof part === 'number') { parent.append(String(part)); return }
  parent.append(part)
}

// b8r-style composition: move provided children into the view's `[data-children]`
// (emptied first, as b8r does). b8r silently drops children when a view has no
// `[data-children]`; we warn instead (surface breakage — see COMPATIBILITY.md).
const warnedNoSlot = new Set()
function slotChildren (name, root, children) {
  const dest = root.querySelector('[data-children]')
  if (dest === null) {
    if (!warnedNoSlot.has(name)) {
      warnedNoSlot.add(name)
      console.warn(
        'b8r-tjs: component "' + name + '" was given children but its view has no ' +
        '`[data-children]` element, so they were dropped. Add one to receive them ' +
        '(e.g. `div({ dataChildren: true })`).'
      )
    }
    return
  }
  dest.textContent = ''
  for (const child of children) appendPart(dest, child)
}

let anonSeq = 0

// Make a component **element creator** from a spec — the ergonomic, composable
// authoring API (mirrors tosijs creators like `elements.div` / `liveExample`).
// `makeComponent(spec)` registers ONE redefinable definition and returns a creator
// `(...parts) => element`. Calling the creator builds a component instance:
//
//   const counter = makeComponent({ view, initialValue })
//   preview.append(counter())                          // a fresh instance
//   preview.append(counter({ class: 'big', bindShowIf: 'app.on' }, h2('Title')))
//
// Object parts are applied to the component root (attributes, `bindX`/`onX` →
// `data-bind`/`data-event`, `style`, `class` — via `b8r-elements`); node/string
// parts are slotted into the view's `[data-children]` (b8r-style transclusion,
// like `<b8r-component>…children…</b8r-component>`). Light-DOM, not a custom
// element — so composition is `data-children`, not a shadow `<slot>`.
export function makeComponent (spec, options = {}) {
  const name = options.name === undefined ? 'b8r-anon-' + (anonSeq = anonSeq + 1) : options.name
  const tag = options.tag === undefined ? 'div' : options.tag
  const entry = defineB8rComponent(name, spec)
  return function (...parts) {
    const props = []
    const children = []
    for (const part of parts) {
      if (part === null || part === undefined) continue
      if (typeof part === 'object' && part.nodeType === undefined && !Array.isArray(part)) props.push(part)
      else children.push(part)
    }
    const root = create(tag, ...props) // applies bindX/onX/attrs/style/class to the root
    entry.mount(root, options.data)    // stamp the view (built synchronously; `load` runs after)
    if (children.length) slotChildren(name, root, children)
    return root
  }
}
