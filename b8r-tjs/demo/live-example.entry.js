// Bundled entry for demo/live-example.html — a b8r component fiddle running inside
// tosijs-ui's <live-example>. Bundled with bun (see demo/vendor.mjs) so tosijs-ui's
// extensionless ESM imports resolve, sucrase (its transform) is inlined, and there
// is ONE shared tosijs instance across the adapter, the loader, and live-example.
import * as tosijs from 'tosijs'
import { liveExample } from 'tosijs-ui'
import { b8rExampleContext } from '../dist/b8r-example.js'

const fiddleJs = `// a b8r component, instantiated into the live-example preview via the loader
import { makeComponent } from 'b8r-tjs'

const counter = makeComponent({
  css: '._component_ { font-size: 1.4rem; display: flex; gap: 12px; align-items: center }' +
       '._component_ button { font: inherit; padding: 4px 12px; cursor: pointer }',
  view: ({ div, button, span }) => div(
    span({ class: 'n', bindText: 'count: \${_component_.count}' }),
    button('+1', { class: 'inc', onClick: '_component_.inc' }),
    button('reset', { class: 'reset', onClick: '_component_.reset' })
  ),
  initialValue: ({ component }) => ({
    count: 0,
    inc: () => { component.data.count = component.data.count + 1 },
    reset: () => { component.data.count = 0 }
  })
})
preview.append(counter())`

const example = liveExample({ context: { tosijs, ...b8rExampleContext } })
example.js = fiddleJs
document.querySelector('#host').append(example)

function preview () {
  // LiveExample renders in light DOM (tag <tosi-example>), preview is `.preview`
  return example.querySelector('.preview')
}
window.fiddle = {
  ready: () => !!preview(),
  countText: () => { const p = preview(); const n = p && p.querySelector('.n'); return n ? n.textContent : null },
  clickInc: () => { const p = preview(); const b = p && p.querySelector('.inc'); if (b) b.click() },
  clickReset: () => { const p = preview(); const b = p && p.querySelector('.reset'); if (b) b.click() },
  error: () => { const p = preview(); const e = p && p.querySelector('.preview-error'); return e ? e.textContent : null }
}
window.b8rTjsReady = true
