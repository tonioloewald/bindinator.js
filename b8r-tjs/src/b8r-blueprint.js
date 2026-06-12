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
rewritten to a per-instance scope (`_b8r.<id>` in the registry).

**Components are redefinable definitions, not custom elements** (a core b8r-tjs
principle): `defineB8rComponent(name, spec)` (re)registers under `name` and
re-stamps every live instance, so editing a component hot-reloads its instances.
*/

import { tosi, xin, tosiValue } from 'tosijs'
import { hydrateB8r } from './b8r-compat.js'
import { elements } from './b8r-elements.js'

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

// rewrite a b8r `_component_.x` path to this instance's scope
function scoped (scope, path) {
  return path.startsWith('_component_') ? scope + path.slice('_component_'.length) : path
}

function valueAtPath (path) {
  let node = xin
  for (const part of path.split('.')) {
    if (node === null || node === undefined) return undefined
    node = node[part]
  }
  return tosiValue(node)
}

// scope a component's CSS (`_component_` → `.<name>-component`) and (re)install
// its single stylesheet, so redefining a component swaps its CSS in place.
function installStyle (entry, name, css) {
  if (entry.style !== null) entry.style.remove()
  if (css === undefined || css === null || css === '') { entry.style = null; return }
  const className = name + '-component'
  const style = document.createElement('style')
  style.textContent = css.replace(/_component_/g, '.' + className)
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
        const handler = valueAtPath(scoped(scope, path))
        if (typeof handler === 'function') handler(event, target)
      })
    }
  }
  const register = function (name, object) { tosi({ [name]: object }) }
  const component = { element: target, get id () { return id }, get data () { return xin._b8r[id] } }
  return { component, scope, b8r: { get, set, find, findOne, on, touch, register }, get, set, find, findOne, on, touch, register }
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

  target.innerHTML = ''
  for (const node of buildView(spec)) target.append(node)
  hydrateB8r(target, { resolve: path => scoped(ctx.scope, path) })

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
}

// Define (or redefine) a b8r component. `spec` is the component's default export
// (`{ css, html|view, load, initialValue, type }`). Redefining re-installs the
// stylesheet and re-stamps every live instance (hot reload). Returns the entry,
// whose `mount(target, data)` instantiates the component.
export function defineB8rComponent (name, spec) {
  ensureRoot()
  let entry = registry[name]
  if (entry === undefined) {
    entry = { spec, style: null, instances: new Map() }
    registry[name] = entry
  } else {
    entry.spec = spec
  }
  installStyle(entry, name, spec.css)

  entry.mount = async function (target, data) {
    const id = 'i' + nextId
    nextId = nextId + 1
    target.classList.add(name + '-component')
    entry.instances.set(id, { target, data })
    await stamp(entry, name, id, target, data)
    return id
  }

  // hot-reload: re-stamp every live instance against the new definition,
  // preserving each instance's current data (re-seeded from its proxy).
  for (const [id, instance] of entry.instances) {
    const current = tosiValue(xin._b8r[id])
    stamp(entry, name, id, instance.target, current)
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
