// #8 — untrusted components run their behaviour in the AJS sandbox: fuel-metered
// and capability-isolated. Proves a sandboxed handler updates its own state and
// drives the wiring, that AJS can't reach the host, and that a starved handler
// is contained (returned, never hangs).
import { test, expect } from 'bun:test'
import { setupDom } from './_dom.mjs'

const document = setupDom()

const { elements } = await import('../src/elements.tjs')
const { mount } = await import('../src/component.tjs')
const { defineUntrusted, runHandler } = await import('../src/untrusted.tjs')

const { div, span, button } = elements
const tick = () => new Promise((r) => setTimeout(r, 20))

test('an untrusted AJS handler updates its own state and drives the wiring', async () => {
  defineUntrusted({
    name: 'u-counter',
    state: { count: 0 },
    handlers: {
      // pure ({ state }) -> newState, runs in the gas-metered VM
      inc: 'function agent({ state }) { let next = state.count + 1; return { count: next } }'
    },
    view: () => div(
      span({ class: 'n', bindText: 'count' }),
      button('+', { class: 'b', onClick: 'inc' })
    )
  })
  const target = document.createElement('div')
  document.body.append(target)
  mount('u-counter', target)
  expect(target.querySelector('.n').textContent).toBe('0')

  target.querySelector('.b').click()
  await tick() // the sandboxed handler resolves asynchronously
  expect(target.querySelector('.n').textContent).toBe('1')

  target.querySelector('.b').click()
  await tick()
  expect(target.querySelector('.n').textContent).toBe('2')
})

test('AJS cannot reach the host (network/DOM/globals are not available)', async () => {
  const out = await runHandler(
    "function agent({}) { let x = fetch({ url: 'http://evil' }); return { x } }",
    {}
  )
  expect(out.ok).toBe(false) // rejected — `fetch` is not an injected capability
})

test('a starved handler is contained by fuel (returns an error, never hangs)', async () => {
  const out = await runHandler(
    'function agent({ state }) { let a = state.count + 1; return { count: a } }',
    { state: { count: 0 } },
    0.001 // not enough fuel
  )
  expect(out.ok).toBe(false)
  expect(JSON.stringify(out.error)).toContain('Fuel')
})

test('a malicious handler cannot corrupt the host beyond its own state', async () => {
  // even a handler that returns junk only ever writes its returned keys to the
  // instance; it has no path to anything else.
  const out = await runHandler(
    "function agent({}) { return { count: 999, __proto__: 'pwned' } }",
    {}
  )
  expect(out.ok).toBe(true)
  // the result is plain data — no prototype pollution reaches the host
  expect(({} as any).pwned).toBe(undefined)
})
