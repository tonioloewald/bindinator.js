// Bundled entry for demo/docs.html — a tosijs-ui doc-browser whose live-example
// fiddles are b8r components, rendered via the blueprint loader. The ONLY wiring
// is spreading `b8rExampleContext` into the doc-browser's `context`; b8r and
// tosijs examples then coexist. Bundled with bun (see demo/vendor.mjs) so
// tosijs-ui's extensionless ESM + sucrase resolve and there's one tosijs instance.
// `docs` is generated from source by build-docs.mjs (curated .md pages with live
// fiddles + each source file's /*# … */ doc comment as API reference).
import * as tosijs from 'tosijs'
import { createDocBrowser } from 'tosijs-ui'
import { b8rExampleContext } from '../dist/b8r-example.js'
import docs from './vendor/docs.generated.js'

const browser = createDocBrowser({
  docs,
  context: { tosijs, ...b8rExampleContext },
  projectName: 'b8r-tjs',
  projectLinks: { github: 'https://github.com/tonioloewald/bindinator.js' }
})
document.body.append(browser)

// expose for verification
function firstPreview () {
  const ex = document.querySelector('tosi-example')
  return ex ? ex.querySelector('.preview') : null
}
window.docs = {
  nav: () => [...document.querySelectorAll('a[href^="?"]')].map(a => a.textContent.trim()),
  hasExample: () => !!document.querySelector('tosi-example'),
  count: () => { const p = firstPreview(); const n = p && p.querySelector('.n'); return n ? n.textContent : null },
  inc: () => { const p = firstPreview(); const b = p && p.querySelector('.inc'); if (b) b.click() },
  error: () => { const p = firstPreview(); const e = p && p.querySelector('.preview-error'); return e ? e.textContent : null },
  go: (filename) => { window.history.pushState({}, '', '?' + filename); window.dispatchEvent(new Event('popstate')) }
}
window.b8rTjsReady = true
