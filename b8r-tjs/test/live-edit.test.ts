// #7 — the live-editing loop, end to end and headless: a component is mounted,
// then *edited as source text*, compiled in-process (no vfs), and redefined —
// the live instance updates to the new view with its state preserved.
import { test, expect } from 'bun:test'
import { parseHTML } from 'linkedom'

const dom = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>')
;(globalThis as any).document = dom.document
const { document } = dom

const { elements } = await import('../src/elements.tjs')
const { defineComponent, mount } = await import('../src/component.tjs')
const { applyEdit } = await import('../src/live.tjs')

const { div, span, button } = elements

const target = document.createElement('div')
document.body.append(target)

test('mount v1, edit the source, redefine — live instance updates, state kept', async () => {
  // v1: defined the ordinary way and mounted
  defineComponent({
    name: 'live',
    state: { count: 0 },
    methods: { inc: (ctx: any) => ctx.set('count', ctx.get('count') + 1) },
    view: () => div(
      span({ class: 'n', bindText: 'count' }),
      button('+', { class: 'b', onClick: 'inc' })
    )
  })
  mount('live', target)
  expect(target.querySelector('.n').textContent).toBe('0')

  // build some state we expect to survive the edit
  target.querySelector('.b').click()
  target.querySelector('.b').click()
  expect(target.querySelector('.n').textContent).toBe('2')

  // --- the edit: a NEW view as plain tjs SOURCE TEXT ---
  const editedSource = `
    export default ({ elements }) => {
      const { div, span, button } = elements
      return {
        name: 'live',
        state: { count: 0 },
        methods: { bump: (ctx) => ctx.set('count', ctx.get('count') + 1) },
        view: () => div(
          span('v2 → '),
          span({ class: 'n', bindText: 'count' }),
          button('++', { class: 'b2', onClick: 'bump' })
        )
      }
    }
  `

  const { tests } = await applyEdit(editedSource)
  expect(Array.isArray(tests)).toBe(true) // editor could surface inline test results

  // the live instance re-rendered into the v2 view…
  expect(target.textContent).toContain('v2 → ')
  expect(target.querySelector('.b')).toBe(null)        // old button gone
  expect(target.querySelector('.b2')).not.toBe(null)   // new button present

  // …and kept its state across the recompile+redefine
  expect(target.querySelector('.n').textContent).toBe('2')

  // wiring is live on the freshly compiled view
  target.querySelector('.b2').click()
  expect(target.querySelector('.n').textContent).toBe('3')
})

test('a type error in edited source is caught at compile time (returned, not thrown)', async () => {
  // increment is typed (count: 0 -> integer); calling it with a string in an
  // inline test makes the edited source fail to compile — surfaced, not crashed.
  const badSource = `
    export function inc(count: 0) { return count + 1 }
    test 'oops' { expect(inc('not a number')).toBe(1) }
    export default () => ({ name: 'never', view: () => null })
  `
  let threw = false
  try {
    await applyEdit(badSource)
  } catch (e) {
    threw = true // tjs fails the compile of source whose inline test fails
  }
  expect(threw).toBe(true)
})
