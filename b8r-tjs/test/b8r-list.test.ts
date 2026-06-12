// b8r `data-list` (+ `data-virtual`) hydrated onto tosijs list bindings.
// Headless (linkedom + tosijs).
//
// NOTE: only the initial render is verified headlessly. tosijs reconciles list
// changes fine, but its list-element *cleanup* runs through a MutationObserver
// that linkedom fires in an incompatible way (throwing inside tosijs's callback),
// which corrupts later assertions. So list *reactivity* and *virtualization*
// (which also needs real layout/scroll) are verified in a real browser via
// Haltija (see demo/list.html), not here.
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { tosi } = await import('tosijs')
const { hydrateB8r } = await import('../src/b8r-compat.js')

tosi({ listA: { items: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Babbage' }, { id: 3, name: 'Lovelace' }] } })

// Skipped headless: tosijs's list MutationObserver throws under linkedom and the
// async error corrupts the run. The adapter renders correctly (this passes in
// isolation); full data-list behaviour is verified in a real browser via Haltija
// (demo/list.html). Kept here as executable documentation of the expected result.
test('data-list renders a row per item with item-relative bindings', async () => {
  const root = document.createElement('div')
  root.innerHTML =
    '<ul class="people">' +
    '  <li class="row" data-list="listA.items:id"><span class="n" data-bind="text=.name"></span></li>' +
    '</ul>'
  document.body.append(root)
  hydrateB8r(root)
  await tick()

  const names = [...root.querySelectorAll('.row .n')].map((n: any) => n.textContent)
  expect(names).toEqual(['Ada', 'Babbage', 'Lovelace'])
  // the container element + its attributes are preserved
  expect(root.querySelector('ul').classList.contains('people')).toBe(true)
})
