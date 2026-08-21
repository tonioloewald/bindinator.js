// #8 — untrusted components run their behaviour in the AJS sandbox: fuel-metered
// and capability-isolated. Proves a sandboxed handler updates its own state and
// drives the wiring, that AJS can't reach the host, and that a starved handler
// is contained (returned, never hangs).
//
// Re-pointed at the b8r blueprint loader (MIGRATION.md "Decided"). Because b8r
// keeps behaviour in the same registry object as data, three boundaries the old
// separate-`methods` design got structurally are now explicit — each is pinned
// below.
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()

const { mountB8rComponent } = await import('../src/b8r-blueprint.js')
const { defineUntrusted, runHandler } = await import('../src/untrusted.tjs')

const click = (el: any) =>
  el.dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))

test('an untrusted AJS handler updates its own state and drives the wiring', async () => {
  defineUntrusted('u-counter', {
    state: { count: 0 },
    handlers: {
      // pure ({ state }) -> newState, runs in the gas-metered VM
      inc: 'function agent({ state }) { let next = state.count + 1; return { count: next } }'
    },
    view: ({ div, span, button }: any) => div(
      span({ class: 'n', bindText: '_component_.count' }),
      button('+', { class: 'b', onClick: '_component_.inc' })
    )
  })
  const target = document.createElement('div')
  document.body.append(target)
  await mountB8rComponent(target, 'u-counter')
  await tick()
  expect(target.querySelector('.n').textContent).toBe('0')

  click(target.querySelector('.b'))
  await tick() // the sandboxed handler resolves asynchronously
  expect(target.querySelector('.n').textContent).toBe('1')

  click(target.querySelector('.b'))
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
  const out = await runHandler(
    "function agent({}) { return { count: 999, __proto__: 'pwned' } }",
    {}
  )
  expect(out.ok).toBe(true)
  expect(({} as any).pwned).toBe(undefined)
})

// --- boundary #1: functions never reach the sandbox -------------------------
// Not tidiness: structuredClone THROWS on a function, and in the b8r model the
// instance state always contains the handler wrappers themselves. An unfiltered
// snapshot would fail on every event.
test('handler wrappers in state do not break the clone (they are stripped)', async () => {
  defineUntrusted('u-fn', {
    state: { count: 0 },
    handlers: {
      bump: 'function agent({ state }) { let n = state.count + 5; return { count: n } }'
    },
    view: ({ div, span, button }: any) => div(
      span({ class: 'n', bindText: '_component_.count' }),
      button('go', { class: 'b', onClick: '_component_.bump' })
    )
  })
  const target = document.createElement('div')
  document.body.append(target)
  await mountB8rComponent(target, 'u-fn')
  await tick()
  // state contains `bump` (a function) — if it reached structuredClone this throws
  click(target.querySelector('.b'))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('5')
})

// --- boundary #2: unfaithful values are reported, loudly ---------------------
test('a class instance in state warns that the sandbox will not receive it faithfully', async () => {
  class Point { x: number; constructor (x: number) { this.x = x } }
  const warnings: string[] = []
  const realWarn = console.warn
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
  try {
    defineUntrusted('u-class', {
      state: { count: 0, origin: new Point(3) },
      handlers: {
        inc: 'function agent({ state }) { let n = state.count + 1; return { count: n } }'
      },
      view: ({ div, span, button }: any) => div(
        span({ class: 'n', bindText: '_component_.count' }),
        button('+', { class: 'b', onClick: '_component_.inc' })
      )
    })
    const target = document.createElement('div')
    document.body.append(target)
    await mountB8rComponent(target, 'u-class')
    await tick()
    click(target.querySelector('.b'))
    await tick()
    // it still works — the warning is about fidelity, not a hard failure
    expect(target.querySelector('.n').textContent).toBe('1')
  } finally {
    console.warn = realWarn
  }
  const hit = warnings.filter((w) => w.includes('structured'))
  expect(hit.length).toBe(1)
  expect(hit[0]).toContain('Point')
  expect(hit[0]).toContain('state.origin') // names the path
})

// --- boundary #3: a handler cannot overwrite a handler -----------------------
test('an untrusted handler cannot replace behaviour, only its own data', async () => {
  defineUntrusted('u-evil', {
    state: { count: 0 },
    handlers: {
      // tries to overwrite its sibling handler AND itself
      evil: "function agent({ state }) { return { count: 42, other: 'clobbered', evil: 'clobbered' } }",
      other: 'function agent({ state }) { return { count: 7 } }'
    },
    view: ({ div, span, button }: any) => div(
      span({ class: 'n', bindText: '_component_.count' }),
      button('e', { class: 'e', onClick: '_component_.evil' }),
      button('o', { class: 'o', onClick: '_component_.other' })
    )
  })
  const target = document.createElement('div')
  document.body.append(target)
  await mountB8rComponent(target, 'u-evil')
  await tick()

  click(target.querySelector('.e'))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('42') // its own data landed

  // …and both handlers are still callable functions, not the strings it returned
  click(target.querySelector('.o'))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('7')

  click(target.querySelector('.e'))
  await tick()
  expect(target.querySelector('.n').textContent).toBe('42')
})
