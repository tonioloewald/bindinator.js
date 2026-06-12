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

test('list-row events resolve a relative handler against the clicked row item', async () => {
  const picked: string[] = []
  // A relative `data-event="click:.select"` resolves the handler on the *row's*
  // list item (the same way `text=.name` binds the item's field) — so each item
  // carries its own `select`, and clicking a row finds that item's method.
  const note = (name: string) => () => picked.push(name)
  tosi({
    listEv: {
      people: [
        { id: 1, name: 'Ada', select: note('Ada') },
        { id: 2, name: 'Babbage', select: note('Babbage') },
        { id: 3, name: 'Lovelace', select: note('Lovelace') }
      ]
    }
  })
  const root = document.createElement('div')
  root.innerHTML =
    '<ul class="picker">' +
    '  <li class="prow" data-list="listEv.people:id" data-event="click:.select">' +
    '    <span data-bind="text=.name"></span></li>' +
    '</ul>'
  document.body.append(root)
  hydrateB8r(root)
  await tick()

  const rows = [...root.querySelectorAll('.prow')] as any[]
  expect(rows.length).toBe(3)
  rows[1].click()           // delegated listener on the container dispatches to this row
  rows[2].click()
  expect(picked).toEqual(['Babbage', 'Lovelace'])
})
