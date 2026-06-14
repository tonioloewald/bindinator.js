/*#
## b8r-tjs · extra binding targets (opt-in, tree-shakeable)

The heavier / less-common b8r targets, kept **out of the core adapter** so they're
only bundled when you import this module — and even then a bundler keeps only what
you reference. Register them through the adapter's extension point:

    import { registerExtraB8rTargets } from 'b8r-tjs/dist/b8r-targets-extra.js'
    registerExtraB8rTargets()   // now `format`, `img`, `bgImg`, `bytes`, … work

…or compose your own set: `registerB8rBindings({ bindings: { format } })`.

Targets: `format` (light markdown), `img` / `bgImg` (lazy images), `bytes`,
`timestamp`, `json`. (Interpolation `${…}` is handled by the core before a target
runs, so these receive the already-assembled value.)
*/

import { tosiValue } from 'tosijs'
import { registerB8rBindings } from './b8r-compat.js'

// b8r's `format`: light markdown (**bold** / *italic* → <b>/<i>) → innerHTML;
// plain (or anything containing markup) is set as textContent (script-injection-safe).
function format (element, value) {
  const content = value === null || value === undefined ? '' : String(value)
  if (/[*_]/.test(content) && !/[<>]/.test(content)) {
    element.innerHTML = content
      .replace(/[*_]{2}(.*?)[*_]{2}/g, '<b>$1</b>')
      .replace(/[*_](.*?)[*_]/g, '<i>$1</i>')
  } else {
    element.textContent = content
  }
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
function humanBytes (value) {
  let n = Number(value)
  if (!isFinite(n)) return ''
  let unit = 0
  while (n >= 1024 && unit < BYTE_UNITS.length - 1) { n = n / 1024; unit = unit + 1 }
  return (unit === 0 ? String(n) : n.toFixed(1)) + ' ' + BYTE_UNITS[unit]
}

function toDate (value) {
  return value instanceof Date ? value : new Date(value)
}

// non-parameterised extra targets
export const extraB8rBindings = {
  format: { toDOM: format },
  bytes: { toDOM (element, value) { element.textContent = humanBytes(value) } },
  json: { toDOM (element, value) { element.textContent = JSON.stringify(tosiValue(value), null, 2) } },
  timestamp: {
    toDOM (element, value) {
      const date = toDate(value)
      element.textContent = isNaN(date.getTime()) ? '' : date.toLocaleString()
    }
  },
  // lazy image: load off-DOM, then set src (falls back to a direct set where there
  // is no `Image` constructor, e.g. headless tests)
  img: {
    toDOM (element, value) {
      if (value === null || value === undefined || value === '') return
      if (typeof Image === 'function') {
        const loader = new Image()
        loader.onload = () => { element.src = value }
        loader.src = value
      } else {
        element.src = value
      }
    }
  },
  bgImg: {
    toDOM (element, value) {
      element.style.backgroundImage = (value === null || value === undefined || value === '')
        ? ''
        : 'url(' + value + ')'
    }
  }
}

// Register every extra target with the adapter. Call once at startup.
export function registerExtraB8rTargets () {
  registerB8rBindings({ bindings: extraB8rBindings })
}
