// The capstone: components are redefinable definitions, bindings are wiring.
// Runs headlessly on linkedom — no browser. Proves instance isolation, surgical
// wiring updates, and hot reload (redefine → live instances update, state kept).
import { test, expect } from 'bun:test'
import { parseHTML } from 'linkedom'

const dom = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>')
;(globalThis as any).document = dom.document
const { document } = dom

const { elements } = await import('../src/elements.tjs')
const { css } = await import('../src/css.tjs')
const { defineComponent, mount, instancesOf } = await import('../src/component.tjs')

const { div, span, button } = elements

// targets and instances persist across tests in this file (shared module state)
const a = document.createElement('div')
const b = document.createElement('div')
document.body.append(a)
document.body.append(b)

const shown = (target: any) => target.querySelector('.tally').textContent

test('mounted instances render initial state and are independent', () => {
  // v1 definition
  defineComponent({
    name: 'counter',
    state: { count: 0 },
    style: css({ '.tally': { fontWeight: 'bold' } }),
    view: (ctx: any) => div(
      span({ class: 'tally', bindText: 'count' }),
      button('+', { class: 'inc', onClick: () => ctx.set('count', ctx.get('count') + 1) })
    )
  })
  mount('counter', a)
  mount('counter', b)
  expect(shown(a)).toBe('0')
  expect(shown(b)).toBe('0')

  // clicking A's button is wiring: only A's bound node updates
  a.querySelector('.inc').click()
  expect(shown(a)).toBe('1')
  expect(shown(b)).toBe('0')
  expect(instancesOf('counter').length).toBe(2)
})

test('a style element is injected once per definition', () => {
  const styles = document.head.querySelectorAll('style[data-component="counter"]')
  expect(styles.length).toBe(1)
  expect(styles[0].textContent).toContain('font-weight: bold;')
})

test('redefining hot-reloads every live instance, keeping per-instance state', () => {
  // (continuing: A shows 1, B shows 0)
  // v2: a different view — a label prefix and a decrement button, SAME state shape
  defineComponent({
    name: 'counter',
    state: { count: 0 },
    style: css({ '.tally': { color: 'red' } }),
    view: (ctx: any) => div(
      span('count = '),
      span({ class: 'tally', bindText: 'count' }),
      button('−', { class: 'dec', onClick: () => ctx.set('count', ctx.get('count') - 1) })
    )
  })

  // every live instance re-rendered into the v2 view…
  expect(document.querySelectorAll('.dec').length).toBe(2)
  expect(a.textContent).toContain('count = ')

  // …and each kept its own state across the redefinition
  expect(shown(a)).toBe('1')
  expect(shown(b)).toBe('0')

  // the new style replaced the old one (still one <style> for the definition)
  const styles = document.head.querySelectorAll('style[data-component="counter"]')
  expect(styles.length).toBe(1)
  expect(styles[0].textContent).toContain('color: red;')
  expect(styles[0].textContent).not.toContain('font-weight')

  // wiring is live again after the hot reload: B's new button decrements B only
  b.querySelector('.dec').click()
  expect(shown(b)).toBe('-1')
  expect(shown(a)).toBe('1')
})
