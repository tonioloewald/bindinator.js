// Shared headless-DOM setup for tosijs-backed tests. tosijs (and tosijs-ui)
// reference DOM globals at import time and update the DOM on an async queue
// (requestAnimationFrame), so tests must: set the globals before importing
// tosijs, connect elements to the document, and await a tick after mutating
// state. Call setupDom() FIRST, then dynamically import tosijs/the shim.
import { parseHTML } from 'linkedom'

let theDocument = null

// Idempotent: creates ONE shared linkedom document, installs the globals, and
// always returns that same document — so every test file (and tosijs, which
// reads globalThis.document at call time) operate on the same DOM.
export function setupDom () {
  if (theDocument) return theDocument
  const dom = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>')
  const globals = [
    'document', 'HTMLElement', 'Element', 'Node', 'Text', 'Comment',
    'DocumentFragment', 'customElements', 'MutationObserver', 'getComputedStyle',
    'NodeFilter', 'HTMLTemplateElement', 'HTMLInputElement', 'HTMLSelectElement',
    'HTMLTextAreaElement', 'HTMLButtonElement', 'HTMLAnchorElement'
  ]
  for (const key of globals) {
    try { if (dom[key] !== undefined) globalThis[key] = dom[key] } catch {}
  }
  try { globalThis.window = globalThis } catch {}
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
  }
  theDocument = dom.document
  return theDocument
}

// tosijs flushes DOM updates on the next frame; await this after changing state
export const tick = () => new Promise((resolve) => setTimeout(resolve, 30))
