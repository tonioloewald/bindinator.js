/*#
## b8r-tjs · b8r → tosijs compatibility adapter

Runs legacy **b8r markup on the tosijs binding engine**. It reads b8r's
`data-bind` / `data-event` attributes and wires them with tosijs `bind` / `on` /
`xin` — hydrating b8r's targets onto tosijs bindings. The binding *syntax* is
unchanged, so existing b8r components/markup keep working:

    data-bind="text=app.message; attr(title)=app.tip; class(active)=app.isOn"
    data-event="click:app.handler"

Supported targets: `text`, `value`, `checked`, `attr(x)`, `prop(x)`, `style(x)`,
`class(x)`, `showIf[(v)]`, `hideIf[(v)]`, `enabledIf`, `disabledIf`. Also covered:
`data-list` (+ `data-virtual`), multi-type / key-qualified events, item-relative
(`.foo`) bind/event paths in list rows (via `^`-template paths + event delegation),
and `${path}` string interpolation (multi-path, via a tosijs TakeDescriptor):

    data-bind="text=Hello ${app.first} ${app.last}!"   // re-renders on either path

**Method bindings** (a dotted target path is a function called `fn(element, value)`)
and **multi-target** bindings (one path → several comma-separated targets) work too:

    data-bind="_component_.render=_component_.data"     // method binding
    data-bind="text,attr(title)=app.label"              // multi-target

An **unknown** target is skipped with a one-time `console.warn` (so gaps surface).
Heavier targets (`format`, `img`, …) aren't in the core — register them with
`registerB8rBindings({ bindings, factories })` so they're only bundled when used.

Known limitation: `${.relative}` interpolation *inside a list row* is not wired
(tosijs doesn't re-target `^` paths within a TakeDescriptor per stamp) — use a
plain `text=.field` binding, or absolute/`_component_` paths, in rows.

Update model: b8r-tjs follows **tosijs's asynchronous updates** and does NOT
emulate b8r's synchronous model. Consequence: a `keydown`/`keypress` handler on a
two-way-bound field runs *before* the field's `change`, so a value-mutating
handler can read a stale value or have its write reverted — use **`keyup`**
instead. The adapter logs a deprecation warning when it sees that pattern.
*/

import { bind, bindings, xin, boxed, tosiValue, elements, getListItem, TAKE_DESCRIPTOR } from 'tosijs'

// navigate the xin registry to a dotted path
function nodeAtPath (path) {
  let node = xin
  for (const part of path.split('.')) {
    if (node === null || node === undefined) return undefined
    node = node[part]
  }
  return node
}

// navigate the BOXED registry to a dotted path — boxed array proxies expose
// `listBinding` (the xin registry proxy does not)
function boxedAtPath (path) {
  let node = boxed
  for (const part of path.split('.')) {
    if (node === null || node === undefined) return undefined
    node = node[part]
  }
  return node
}

// navigate within a list item by a relative path like `.name` or `.a.b`
function itemNode (item, relativePath) {
  let node = item
  for (const part of relativePath.split('.')) {
    if (part === '') continue
    if (node === null || node === undefined) return undefined
    node = node[part]
  }
  return node
}

// resolve a value (e.g. an event handler) at a dotted path through xin
function valueAtPath (path) {
  return tosiValue(nodeAtPath(path))
}

// --- deprecation: b8r's synchronous-update assumption -------------------------
//
// b8r updated its model synchronously; tosijs updates on requestAnimationFrame —
// a better model, which b8r-tjs adopts (we do NOT emulate b8r's synchronous
// updates). One consequence: a `keydown`/`keypress` handler fires BEFORE the
// field's `change` event, so a handler that mutates the bound value can read a
// stale value or have its write reverted by that `change` (the classic
// `keydown(Enter):submit` that adds an item but never clears the input). The fix
// is to use `keyup` (which fires AFTER `change`). We flag the deprecated pattern.
const twoWayElements = new WeakSet() // elements carrying a two-way (fromDOM) binding
const warnedKeydown = new Set()

function warnSyncKeydown (eventType, path) {
  const key = eventType + ':' + path
  if (warnedKeydown.has(key)) return
  warnedKeydown.add(key)
  console.warn(
    'b8r-tjs: `' + eventType + '` handler (' + path + ') on a two-way-bound field ' +
    'assumes b8r’s synchronous updates, which b8r-tjs does not emulate — tosijs ' +
    'updates asynchronously, so the handler may read a stale value or have its ' +
    'write reverted by the field’s `change` event. Use `keyup` instead.'
  )
}


// b8r targets WITHOUT a parameter, expressed as tosijs XinBindings. tosijs always
// calls a binding as `toDOM(element, value)` — there is NO options/arg argument —
// so a parameterised target (`attr(x)`, `class(x)`…) can't read its argument at
// apply time; it must be a binding that CLOSES OVER the argument (see below).
const b8rBindings = {
  text: bindings.text,
  value: bindings.value,
  enabledIf: bindings.enabled,
  disabledIf: bindings.disabled,
  checked: {
    toDOM (element, value) { element.checked = Boolean(value) },
    fromDOM (element) { return element.checked }
  },
  selected: {
    toDOM (element, value) { element.selected = Boolean(value) },
    fromDOM (element) { return element.selected }
  }
}

// b8r targets WITH a parameter, as binding FACTORIES `arg => XinBinding` (the
// tosijs pattern — e.g. its own `attr`/`style` are factories that close over the
// argument). Memoised per `name(arg)` so repeated applies reuse one binding.
const b8rBindingFactories = {
  attr: arg => ({
    toDOM (element, value) {
      if (value === null || value === undefined || value === false) {
        element.removeAttribute(arg)
      } else {
        element.setAttribute(arg, value === true ? '' : String(value))
      }
    }
  }),
  prop: arg => ({ toDOM (element, value) { element[arg] = value } }),
  style: arg => ({ toDOM (element, value) { element.style[arg] = value } }),
  class: arg => ({ toDOM (element, value) { element.classList.toggle(arg, Boolean(value)) } }),
  showIf: arg => ({
    toDOM (element, value) {
      const show = arg === undefined ? Boolean(value) : String(value) === arg
      element.style.display = show ? '' : 'none'
    }
  }),
  hideIf: arg => ({
    toDOM (element, value) {
      const hide = arg === undefined ? Boolean(value) : String(value) === arg
      element.style.display = hide ? 'none' : ''
    }
  })
}

// resolve a b8r target name (+ optional parenthesised arg) to a tosijs XinBinding,
// memoising the parameterised ones by `name(arg)`.
const bindingCache = {}
function bindingFor (name, arg) {
  if (b8rBindings[name] !== undefined) return b8rBindings[name]
  const factory = b8rBindingFactories[name]
  if (factory === undefined) return undefined
  const key = name + '(' + (arg === undefined ? '' : arg) + ')'
  if (bindingCache[key] === undefined) bindingCache[key] = factory(arg)
  return bindingCache[key]
}

// Extension point (keeps the core small + tree-shakeable): register additional
// b8r targets. Heavier targets — `format` (markdown), `img`/`bgImg` (lazy images),
// `bytes`/`timestamp` (formatters) — live in their own module and register here,
// so they're only bundled when that module is imported. `bindings` is a map of
// `name → XinBinding`; `factories` is a map of `name → (arg) => XinBinding`.
export function registerB8rBindings ({ bindings: extraBindings, factories } = {}) {
  if (extraBindings !== undefined) Object.assign(b8rBindings, extraBindings)
  if (factories !== undefined) Object.assign(b8rBindingFactories, factories)
}

// resolve a single b8r binding path to a tosijs bind path: an item-relative
// `.field` becomes the `^`-template path `^.field` (re-targeted per list row on
// stamp); everything else goes through `resolve` (e.g. `_component_` scoping).
function bindPath (rawPath, resolve) {
  return rawPath.startsWith('.') ? '^' + rawPath : resolve(rawPath)
}

// stringify an interpolated value (boxed-proxy-safe; null/undefined → '')
function interpText (value) {
  const v = tosiValue(value)
  return v === null || v === undefined ? '' : String(v)
}

// build a tosijs multi-path TakeDescriptor for a b8r `${path}` interpolation, e.g.
// `clock showing ${_component_.time}` → watch the time path, render the template.
// A lone `${path}` (no surrounding text) passes the raw value through (so a number
// or boolean reaches the target unstringified); a mixed template renders a string.
function interpolationSpec (text, resolve) {
  const paths = []
  const parts = []
  let last = 0
  const re = /\$\{([^}]+)\}/g
  let match = re.exec(text)
  while (match !== null) {
    parts.push(text.slice(last, match.index))
    paths.push(bindPath(match[1].trim(), resolve))
    parts.push({ index: paths.length - 1 })
    last = re.lastIndex
    match = re.exec(text)
  }
  parts.push(text.slice(last))
  const lone = paths.length === 1 && parts.length === 3 && parts[0] === '' && parts[2] === ''
  function transform (...values) {
    if (lone) return tosiValue(values[0])
    let out = ''
    for (const part of parts) out += part !== null && typeof part === 'object' ? interpText(values[part.index]) : part
    return out
  }
  return { [TAKE_DESCRIPTOR]: true, paths, transform }
}

// warn once per unknown target name (surface breakage — see COMPATIBILITY.md)
const warnedTargets = new Set()
function warnUnknownTarget (target) {
  if (warnedTargets.has(target)) return
  warnedTargets.add(target)
  console.warn(
    'b8r-tjs: unknown data-bind target "' + target + '" — binding skipped. Not all ' +
    'b8r targets are ported (see COMPATIBILITY.md); add your own with ' +
    '`registerB8rBindings`.'
  )
}

// a b8r **method binding**: the target is a dotted path to a function, invoked as
// `fn(element, value)` whenever the bound value changes (e.g.
// `data-bind="_component_.render=_component_.data"`).
function methodBinding (methodPath, resolve) {
  const fnPath = resolve(methodPath)
  return {
    toDOM (element, value) {
      const fn = valueAtPath(fnPath)
      // b8r hands method bindings the raw value, not a boxed proxy
      if (typeof fn === 'function') fn(element, tosiValue(value))
    }
  }
}

// bind ONE target token at `rawPath`: a named/parameterised target (`text`,
// `attr(title)`), or a dotted path → method binding. Uses a multi-path
// interpolation binding when the path contains `${…}`.
function bindOneTarget (element, target, rawPath, resolve) {
  // `{{path}}` mustache is NOT a b8r mechanism (some legacy components use it
  // aspirationally — b8r treated the whole string as a bogus path and rendered
  // nothing, silently emptying the element). Warn and skip so static content
  // survives; the working syntax is `${path}`.
  if (rawPath.indexOf('{{') !== -1) {
    if (!warnedTargets.has(rawPath)) {
      warnedTargets.add(rawPath)
      console.warn(
        'b8r-tjs: `{{…}}` in a data-bind value is not b8r interpolation — binding ' +
        'skipped (static content kept). Use `${path}` interpolation instead: ' + rawPath
      )
    }
    return
  }
  // NB: the name part `[\w-]+` can't contain dots, so a dotted-LHS method
  // binding fails this match entirely (while `method(path.with.dots)` passes —
  // dots are fine in the parenthesised arg).
  const match = target.match(/^([\w-]+)(?:\(([^)]*)\))?$/)
  let binding
  if (match !== null) {
    // b8r's exact normalization (bindings.js): snake_case → camelCase, so
    // `show_if` is `showIf`; and `method(path.to.fn)` is the explicit form of
    // the dotted-LHS method binding.
    const name = match[1].replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    binding = name === 'method' && match[2] !== undefined
      ? methodBinding(match[2], resolve)
      : bindingFor(name, match[2])
    if (binding === undefined) { warnUnknownTarget(target); return }
  } else if (target.indexOf('.') !== -1) {
    binding = methodBinding(target, resolve)
  } else {
    warnUnknownTarget(target)
    return
  }
  if (rawPath.indexOf('${') !== -1) {
    bind(element, interpolationSpec(rawPath, resolve), binding)
  } else {
    const what = bindPath(rawPath, resolve)
    bind(element, what, binding)
    // note two-way (fromDOM) fields so we can flag the deprecated synchronous
    // `keydown` pattern on them (see warnSyncKeydown).
    if (binding.fromDOM !== undefined) twoWayElements.add(element)
  }
}

// apply a full `data-bind` spec: entries split by `;`/newline, each `targets=path`
// where `targets` may be comma-separated (one path → several targets, e.g.
// `text,attr(title)=app.msg`). Shared by top-level and list-row binding, so both
// get multi-target, method bindings, interpolation, and relative-path handling.
function applyBindings (element, spec, resolve) {
  for (const entry of spec.split(/;|\n/)) {
    const trimmed = entry.trim()
    if (trimmed === '') continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const targetPart = trimmed.slice(0, eq).trim()
    const rawPath = trimmed.slice(eq + 1).trim()
    for (const target of splitTopLevel(targetPart, ',')) {
      const token = target.trim()
      if (token !== '') bindOneTarget(element, token, rawPath, resolve)
    }
  }
}

// --- events: b8r `data-event` (multi-type, key-qualified) → addEventListener ---

// normalize a keyboard event to b8r's keystroke form: alt-ctrl-meta-shift-Code
// (event codes have Key/Digit stripped, so `KeyA` → `A`, `Digit0` → `0`)
function keystroke (event) {
  const code = []
  if (event.altKey) code.push('alt')
  if (event.ctrlKey) code.push('ctrl')
  if (event.metaKey) code.push('meta')
  if (event.shiftKey) code.push('shift')
  code.push((event.code || event.key || '').replace(/Key|Digit/, ''))
  return code.join('-')
}

// split on `sep` at the top level only (commas inside `(...)` are preserved)
function splitTopLevel (text, sep) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth = depth + 1
    else if (char === ')') depth = depth - 1
    if (char === sep && depth === 0) { parts.push(current); current = '' } else current = current + char
  }
  parts.push(current)
  return parts
}

// parse "click,keydown(Space,Enter):path" → { types:[{event,keys}], path }
function parseEvent (instruction) {
  const colon = instruction.indexOf(':')
  if (colon === -1) return null
  const path = instruction.slice(colon + 1).trim()
  const types = []
  for (const part of splitTopLevel(instruction.slice(0, colon).trim(), ',')) {
    const match = part.trim().match(/^(\w+)(?:\(([^)]*)\))?$/)
    if (match === null) continue
    const keys = match[2] === undefined
      ? null
      : match[2].split(',').map(k => k.replace(/Key|Digit/g, '').trim())
    types.push({ event: match[1], keys })
  }
  return { types, path }
}

// wire an element's `data-event` spec. `resolveHandler(path, event, element)`
// yields the handler function (so list rows can resolve relative `.foo` handlers).
function wireEvents (element, spec, resolveHandler) {
  for (const instruction of spec.split(/;|\n/)) {
    const trimmed = instruction.trim()
    if (trimmed === '') continue
    const parsed = parseEvent(trimmed)
    if (parsed === null) continue
    for (const type of parsed.types) {
      if ((type.event === 'keydown' || type.event === 'keypress') && twoWayElements.has(element)) {
        warnSyncKeydown(type.event, parsed.path)
      }
      element.addEventListener(type.event, function (event) {
        if (type.keys !== null && type.keys.indexOf(keystroke(event)) === -1) return
        const handler = resolveHandler(parsed.path, event, element)
        if (typeof handler === 'function') handler(event, element)
      })
    }
  }
}

// --- list-row event delegation -------------------------------------------------
//
// tosijs stamps each row by cloning the template prototype, and cloneNode does
// NOT copy addEventListener handlers — so per-row wiring (like bindElement's
// `wireEvents`) would be lost. Instead we attach ONE listener per event type to
// the list container and let it dispatch to the originating row element. The
// handler is resolved per event, so a row's `data-event="click:.select"` finds
// the *clicked* row's item via `getListItem`.

// collect the distinct DOM event types named in a template's `data-event` specs
// (including descendants), so we know which listeners the container needs.
function collectEventTypes (templateElement) {
  const types = new Set()
  const sources = [templateElement, ...templateElement.querySelectorAll('[data-event]')]
  for (const element of sources) {
    const spec = element.getAttribute('data-event')
    if (spec === null) continue
    for (const instruction of spec.split(/;|\n/)) {
      const parsed = parseEvent(instruction.trim())
      if (parsed === null) continue
      for (const type of parsed.types) types.add(type.event)
    }
  }
  return [...types]
}

// resolve a row handler path. A relative `.foo` path is rooted at the row's list
// item (looked up from the event's originating element via `getListItem`); an
// absolute path goes through the binding `resolve` then the xin registry.
function resolveRowHandler (path, element, resolve) {
  if (path.startsWith('.')) {
    const item = getListItem(element)
    if (item === undefined || item === null) return undefined
    return itemNode(tosiValue(item), path)
  }
  return valueAtPath(resolve(path))
}

// attach one delegated listener per event type to a freshly-built list container.
// On an event it walks from the target up to the container; for each element with
// a `data-event` matching this type (and any key qualifier) it resolves and calls
// the handler. Resolution is per event, so each row gets its own item.
function delegateRowEvents (container, eventTypes, resolve) {
  for (const eventType of eventTypes) {
    container.addEventListener(eventType, function (event) {
      let element = event.target
      while (element !== null && element !== container.parentNode) {
        const spec = element.getAttribute === undefined ? null : element.getAttribute('data-event')
        if (spec !== null) {
          for (const instruction of spec.split(/;|\n/)) {
            const parsed = parseEvent(instruction.trim())
            if (parsed === null) continue
            for (const type of parsed.types) {
              if (type.event !== eventType) continue
              if (type.keys !== null && type.keys.indexOf(keystroke(event)) === -1) continue
              const handler = resolveRowHandler(parsed.path, element, resolve)
              if (typeof handler === 'function') handler(event, element)
            }
          }
        }
        if (element === container) break
        element = element.parentNode
      }
    })
  }
}

// --- list bindings: b8r `data-list` (+ `data-virtual`) → tosijs list binding ---

// wire one row element's data-bind/data-event relative to its list `item`
// (`.field` paths resolve within the item; absolute paths go through `resolve`)
function bindRowElement (element, item, resolve) {
  const bindSpec = element.getAttribute('data-bind')
  if (bindSpec !== null) {
    // same applier as top-level: relative `.field` → `^.field` template paths
    // (re-targeted per row on stamp), plus multi-target / method / interpolation.
    applyBindings(element, bindSpec, resolve)
    element.removeAttribute('data-bind')
  }
  // NB: `data-event` is intentionally left on row elements — row events are
  // handled by ONE delegated listener per type on the list container (see
  // delegateRowEvents). Per-element listeners wouldn't survive tosijs cloning
  // the row prototype for each item.
}

// build one row from the b8r template element, bound to `item`
function buildRow (templateElement, item, resolve) {
  const row = templateElement.cloneNode(true)
  row.removeAttribute('data-list')
  row.removeAttribute('data-virtual')
  bindRowElement(row, item, resolve)
  for (const element of row.querySelectorAll('[data-bind],[data-event]')) {
    bindRowElement(element, item, resolve)
  }
  return row
}

// replace a b8r `data-list` template's container with a tosijs list binding.
// `data-list="path:idPath"` selects the array + reconciliation key;
// `data-virtual="<rowHeight>"` opts into tosijs virtual (windowed) rendering.
function bindList (templateElement, resolve) {
  const spec = templateElement.getAttribute('data-list')
  const colon = spec.indexOf(':')
  const listPath = resolve((colon === -1 ? spec : spec.slice(0, colon)).trim())
  const idPath = colon === -1 ? undefined : spec.slice(colon + 1).trim()
  const arrayProxy = boxedAtPath(listPath)
  // NB: avoid `typeof` here — tjs rewrites it to a runtime helper that misreports
  // methods on tosijs boxed proxies. A valid array path yields a list-capable proxy.
  if (arrayProxy === undefined || arrayProxy === null) return
  const options = { idPath }
  // `data-virtual="<rowHeight>"` opts into tosijs's virtual (windowed) rendering;
  // `data-columns` / `data-chunk` map to its grid `visibleColumns` / `rowChunkSize`.
  const virtual = templateElement.getAttribute('data-virtual')
  if (virtual !== null) {
    options.virtual = { height: Number(virtual) }
    const columns = templateElement.getAttribute('data-columns')
    if (columns !== null) options.virtual.visibleColumns = Number(columns)
    const chunk = templateElement.getAttribute('data-chunk')
    if (chunk !== null) options.virtual.rowChunkSize = Number(chunk)
  }
  const container = templateElement.parentElement
  if (container === null) return
  const tag = container.tagName.toLowerCase()
  const tuple = arrayProxy.listBinding(function (_elements, item) {
    return buildRow(templateElement, item, resolve)
  }, options)
  // carry the container's attributes as PROPS in the creator call (like
  // `div({ class }, ...listBinding(...))`) — setting them via setAttribute after
  // the list is bound makes tosijs reset the container and drop the rows.
  const props = {}
  for (const attribute of [...container.attributes]) props[attribute.name] = attribute.value
  const newContainer = elements[tag](props, ...tuple)
  // one delegated listener per event type the rows use (cloneNode drops per-row
  // listeners; see delegateRowEvents). Relative `.foo` handlers resolve per row.
  delegateRowEvents(newContainer, collectEventTypes(templateElement), resolve)
  container.replaceWith(newContainer)
}

// b8r's `getListInstance(element)`: the list item that owns `element` (or one of
// its ancestors), as the live **boxed proxy** — so a row event handler can read
// AND mutate the item (`item.done = !item.done` updates the list). Returns
// undefined outside a list. (tosijs `getListItem` does the lookup.)
export function getListInstance (element) {
  return getListItem(element)
}

function identity (path) { return path }

// Wire one element's b8r `data-bind` / `data-event` attributes via tosijs.
// `resolve` rewrites paths before binding (e.g. `_component_.x` → an instance
// scope); it defaults to the identity (paths are absolute registry paths).
export function bindElement (element, resolve = identity) {
  const bindSpec = element.getAttribute('data-bind')
  if (bindSpec !== null) applyBindings(element, bindSpec, resolve)
  const eventSpec = element.getAttribute('data-event')
  if (eventSpec !== null) wireEvents(element, eventSpec, path => valueAtPath(resolve(path)))
}

// Hydrate every b8r binding within a root element (inclusive) onto tosijs.
// `options.resolve` (path → path) rewrites paths, e.g. for instance scoping.
// component-boundary check: an element inside `root` belongs to `root`'s scope
// only if no NESTED component sits between them. Without this, hydrating a parent
// would re-bind an already-stamped child component's internals against the
// parent's scope (b8r respected component boundaries; so do we). A boundary is a
// mounted instance (`data-component-id`) or a declared placeholder
// (`b8r-component` / `data-component`). The element's own attributes don't count —
// bindings ON a component element (e.g. `bindShowIf`) belong to the outer scope.
function ownedByRoot (element, root) {
  let node = element.parentElement
  while (node !== null && node !== root) {
    if (node.getAttribute('data-component-id') !== null ||
        node.tagName === 'B8R-COMPONENT' ||
        node.getAttribute('data-component') !== null) return false
    node = node.parentElement
  }
  return true
}

export function hydrateB8r (root, options = {}) {
  const resolve = options.resolve === undefined ? identity : options.resolve
  // lists first: each `data-list` template owns its subtree and replaces its
  // container with a tosijs-managed list (whose rows have their attrs consumed).
  for (const listElement of [...root.querySelectorAll('[data-list]')]) {
    if (!ownedByRoot(listElement, root)) continue
    bindList(listElement, resolve)
  }
  bindElement(root, resolve)
  for (const element of root.querySelectorAll('[data-bind],[data-event]')) {
    if (!ownedByRoot(element, root)) continue
    bindElement(element, resolve)
  }
}

