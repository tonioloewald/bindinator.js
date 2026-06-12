/*#
## b8r-tjs · b8r `elements` creator (ported)

A faithful port of b8r's element-creator so modern b8r components — whose
`view` is a function `({ div, button, … }) => node | node[]` — run unchanged.
It builds plain DOM and records binding intent as **`data-bind` / `data-event`
attributes**, which `hydrateB8r` then wires onto tosijs. (Ported, not depended
on: b8r-tjs has no b8r runtime dependency — see CLAUDE.md "port, don't depend".)

    const { div, button } = elements
    div(
      button('Add', { onClick: '_component_.add', bindEnabledIf: '_component_.text' })
    )

Object arguments are "sacks of attributes" with b8r's conveniences:
- `bindX: 'path'`     → `data-bind="x=path"`     (`bindText`, `bindValue`, …)
- `onX: 'path'`       → `data-event="x:path"`    (`onClick`, `onKeydown(Enter)`)
- `dataList: 'path'`  → `data-list="path"`
- `key.with.dot`      → method binding `data-bind="key.with.dot=value"`
- `style` string/object, `camelCase` attrs → `kebab-case`, booleans as presence.
*/

const templates = {}

// kebab-case a camelCase identifier (fooBar → foo-bar)
function kebab (name) {
  return name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
}

// lowercase only the first letter (the target/event name after `bind`/`on`)
function lowerFirst (name) {
  return name.replace(/^[A-Z]/, c => c.toLowerCase())
}

function applyAttributes (element, item) {
  const dataBindings = []
  const eventBindings = []
  for (const key of Object.keys(item)) {
    const value = item[key]
    if (key === 'bindList') {
      element.dataset.list = value
    } else if (key.includes('.')) {
      // a key containing a period is a b8r method-binding: `key=value`
      dataBindings.push(key + '=' + value)
    } else if (/^bind[A-Z]/.test(key)) {
      dataBindings.push(lowerFirst(key.slice(4)) + '=' + value)
    } else if (/^on[A-Z]/.test(key)) {
      eventBindings.push(lowerFirst(key.slice(2)) + ':' + value)
    } else if (key === 'style') {
      if (value !== null && typeof value === 'object') {
        for (const prop of Object.keys(value)) element.style[prop] = value[prop]
      } else {
        element.setAttribute('style', value)
      }
    } else {
      const attr = kebab(key)
      if (typeof value === 'boolean') {
        if (value) element.setAttribute(attr, ''); else element.removeAttribute(attr)
      } else {
        element.setAttribute(attr, value)
      }
    }
  }
  if (dataBindings.length) element.dataset.bind = dataBindings.join('\n')
  if (eventBindings.length) element.dataset.event = eventBindings.join('\n')
}

// create(tag, ...contents): strings/numbers → text nodes, nodes → appended,
// objects → attributes (with the b8r conveniences above)
export function create (tagType, ...contents) {
  if (!templates[tagType]) templates[tagType] = document.createElement(tagType)
  const element = templates[tagType].cloneNode()
  for (const item of contents) {
    if (item === null || item === undefined) continue
    if (typeof item === 'string' || typeof item === 'number') {
      element.append(String(item))
    } else if (Array.isArray(item)) {
      for (const child of item) if (child !== null && child !== undefined) element.append(child)
    } else if (typeof item === 'object' && item.nodeType !== undefined) {
      element.append(item)
    } else if (typeof item === 'object') {
      applyAttributes(element, item)
    }
  }
  return element
}

function fragment (...contents) {
  const frag = document.createDocumentFragment()
  for (const item of contents) frag.append(item)
  return frag
}

// the `elements` proxy: `elements.fooBar` → a `create('foo-bar', …)` wrapper
// (camelCase tag names become custom-element kebab-case, matching b8r).
export const elements = new Proxy({ _fragment: fragment }, {
  get (target, tagName) {
    if (typeof tagName !== 'string') return target[tagName]
    const tag = kebab(tagName)
    if (!(tag in target)) target[tag] = (...contents) => create(tag, ...contents)
    return target[tag]
  },
  set () { throw new Error('elements is read-only') }
})
