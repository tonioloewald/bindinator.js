// #7 — the live-editing loop, end to end and headless: a component is mounted,
// then *edited as source text*, compiled in-process (no vfs), and redefined —
// the live instance updates to the new view with its state preserved.
//
// Re-pointed at the b8r blueprint loader (MIGRATION.md "Decided"): the editable
// factory now returns a b8r spec, and redefinition goes through
// defineB8rComponent, whose hot-reload re-stamps live instances.
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()

const { defineB8rComponent, mountB8rComponent } = await import('../src/b8r-blueprint.js')
const { applyEdit } = await import('../src/live.tjs')

const target = document.createElement('div')
document.body.append(target)

test('mount v1, edit the source, redefine — live instance updates, state kept', async () => {
  // v1: defined the ordinary way and mounted
  defineB8rComponent('live', {
    view: ({ div, span, button }: any) => div(
      span({ class: 'n', bindText: '_component_.count' }),
      button('+', { class: 'b', onClick: '_component_.inc' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0,
      inc () { component.data.count = component.data.count + 1 }
    })
  })
  await mountB8rComponent(target, 'live')
  await tick()
  expect(target.querySelector('.n').textContent).toBe('0')

  // build some state we expect to survive the edit
  target.querySelector('.b').dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
  await tick()
  target.querySelector('.b').dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('2')

  // --- the edit: a NEW view as plain tjs SOURCE TEXT ---
  const editedSource = `
    export default ({ elements }) => ({
      view: ({ div, span, button }) => div(
        span('v2 → '),
        span({ class: 'n', bindText: '_component_.count' }),
        button('++', { class: 'b2', onClick: '_component_.bump' })
      ),
      initialValue: ({ component }) => ({
        count: 0,
        bump () { component.data.count = component.data.count + 1 }
      })
    })
  `

  const { tests, name } = await applyEdit(editedSource, 'live')
  expect(name).toBe('live')
  expect(Array.isArray(tests)).toBe(true) // editor could surface inline test results
  await tick()

  // the live instance re-rendered into the v2 view…
  expect(target.textContent).toContain('v2 → ')
  expect(target.querySelector('.b')).toBe(null)        // old button gone
  expect(target.querySelector('.b2')).not.toBe(null)   // new button present

  // …and kept its state across the recompile+redefine
  expect(target.querySelector('.n').textContent).toBe('2')

  // wiring is live on the freshly compiled view, via the NEW handler name
  target.querySelector('.b2').dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('3')
})

test('an edited method BODY takes effect — old state must not shadow new behaviour', async () => {
  // b8r keeps methods inside the instance's state object, and hot-reload overlays
  // preserved state on top of the new initialValue — so a stale method could
  // shadow an edited one. This pins that it doesn't.
  const el = document.createElement('div')
  document.body.append(el)

  defineB8rComponent('shadow', {
    view: ({ div, span, button }: any) => div(
      span({ class: 'v', bindText: '_component_.count' }),
      button('go', { class: 'go', onClick: '_component_.step' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0,
      step () { component.data.count = component.data.count + 1 } // v1: +1
    })
  })
  await mountB8rComponent(el, 'shadow')
  await tick()
  el.querySelector('.go').dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
  await tick()
  expect(el.querySelector('.v').textContent).toBe('1')

  // same view, same method NAME, different body: +10
  await applyEdit(`
    export default () => ({
      view: ({ div, span, button }) => div(
        span({ class: 'v', bindText: '_component_.count' }),
        button('go', { class: 'go', onClick: '_component_.step' })
      ),
      initialValue: ({ component }) => ({
        count: 0,
        step () { component.data.count = component.data.count + 10 }
      })
    })
  `, 'shadow')
  await tick()

  expect(el.querySelector('.v').textContent).toBe('1') // state survived
  el.querySelector('.go').dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
  await tick()
  expect(el.querySelector('.v').textContent).toBe('11') // NEW body ran, not the old +1
})

test('a type error in edited source is caught at compile time (returned, not thrown)', async () => {
  // increment is typed (count: 0 -> integer); calling it with a string in an
  // inline test makes the edited source fail to compile — surfaced, not crashed.
  const badSource = `
    export function inc(count: 0) { return count + 1 }
    test 'oops' { expect(inc('not a number')).toBe(1) }
    export default () => ({ view: () => null })
  `
  let threw = false
  try {
    await applyEdit(badSource, 'never')
  } catch (e) {
    threw = true // tjs fails the compile of source whose inline test fails
  }
  expect(threw).toBe(true)
})
