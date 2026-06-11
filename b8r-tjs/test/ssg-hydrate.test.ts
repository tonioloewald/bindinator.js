// Static generation + hydration, headless. Proves: a definition renders to a
// static HTML string with content + serializable wiring attributes (SEO/TTFI),
// and that markup is *adopted* in place on hydrate (same nodes, not rebuilt)
// with bindings and events wired to live state.
import { test, expect } from 'bun:test'
import { setupDom } from './_dom.mjs'

const document = setupDom()

const { elements } = await import('../src/elements.tjs')
const { defineComponent, renderToString, hydrate } = await import('../src/component.tjs')

const { div, span, button } = elements

defineComponent({
  name: 'ssg-counter',
  state: { count: 0 },
  methods: {
    inc (ctx: any) { ctx.set('count', ctx.get('count') + 1) }
  },
  view: () => div(
    span({ class: 'tally', bindText: 'count' }),
    button('+', { class: 'inc', onClick: 'inc' })
  )
})

test('renderToString bakes in content + serializable wiring attributes', () => {
  const html = renderToString('ssg-counter', { count: 5 })
  expect(html).toContain('data-bind="text:count"')   // binding survives to markup
  expect(html).toContain('data-event="click:inc"')   // event survives to markup
  expect(html).toContain('>5<')                        // content is pre-rendered (SEO/TTFI)
})

test('hydrate adopts the existing server DOM in place (no rebuild) and wires it', () => {
  // "server" markup placed into the page (parsed to real nodes with attributes)
  const target = document.createElement('div')
  target.innerHTML = renderToString('ssg-counter', { count: 5 })
  document.body.append(target)

  // stamp the existing nodes to prove they survive hydration (adopted, not rebuilt)
  const serverButton = target.querySelector('.inc') as any
  const serverTally = target.querySelector('.tally') as any
  serverButton.__fromServer = true
  serverTally.__fromServer = true

  hydrate('ssg-counter', target, { count: 5 })

  // same node instances — the DOM was adopted, not recreated
  expect((target.querySelector('.inc') as any).__fromServer).toBe(true)
  expect((target.querySelector('.tally') as any).__fromServer).toBe(true)

  // bound node reflects the hydrated state…
  expect(target.querySelector('.tally').textContent).toBe('5')

  // …and wiring is live on the adopted nodes
  target.querySelector('.inc').click()
  expect(target.querySelector('.tally').textContent).toBe('6')
})
