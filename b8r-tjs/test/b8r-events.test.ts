// b8r `data-event`: multi-type, key-qualified, and modifier keystrokes, wired
// onto addEventListener via the adapter. Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { tosi } = await import('tosijs')
const { hydrateB8r } = await import('../src/b8r-compat.js')

let multi = 0
let enter = 0
let save = 0
tosi({
  ev: {
    multi: () => { multi = multi + 1 },
    enter: () => { enter = enter + 1 },
    save: () => { save = save + 1 }
  }
})

const Ev = (document as any).defaultView.Event
function fireKey (el: any, code: string, mods: any = {}) {
  const event = new Ev('keydown')
  event.code = code
  Object.assign(event, mods)
  el.dispatchEvent(event)
}
function mount (html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  hydrateB8r(root)
  return root
}

test('multi-type events (click,keydown) fire the handler on either type', async () => {
  const root = mount('<button class="b" data-event="click,keydown:ev.multi"></button>')
  await tick()
  root.querySelector('.b').click()
  expect(multi).toBe(1)
  fireKey(root.querySelector('.b'), 'Enter')
  expect(multi).toBe(2)
})

test('key-qualified events fire only on the matching keystroke', async () => {
  const root = mount('<input class="i" data-event="keydown(Enter):ev.enter">')
  await tick()
  fireKey(root.querySelector('.i'), 'Escape')
  expect(enter).toBe(0)            // wrong key — ignored
  fireKey(root.querySelector('.i'), 'KeyA')
  expect(enter).toBe(0)            // wrong key — ignored
  fireKey(root.querySelector('.i'), 'Enter')
  expect(enter).toBe(1)           // match
})

test('a qualifier list matches any of several keystrokes', async () => {
  let hit = 0
  tosi({ q: { go: () => { hit = hit + 1 } } })
  const root = mount('<input class="m" data-event="keydown(Enter,Escape):q.go">')
  await tick()
  fireKey(root.querySelector('.m'), 'Enter')
  fireKey(root.querySelector('.m'), 'Escape')
  fireKey(root.querySelector('.m'), 'KeyX')   // not in the list
  expect(hit).toBe(2)
})

// b8r-tjs adopts tosijs's async update model (it does NOT emulate b8r's
// synchronous updates), so a `keydown` handler on a two-way-bound field is the
// deprecated pattern (fires before the field's `change` → stale read / clobbered
// write). The adapter warns and steers users to `keyup`.
function captureWarnings (fn: () => void): string[] {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
  try { fn() } finally { console.warn = original }
  return warnings
}

test('keydown on a two-way-bound field warns and recommends keyup (sync deprecated)', () => {
  const warnings = captureWarnings(() =>
    mount('<input data-bind="value=wk.a" data-event="keydown(Enter):wk.go">'))
  expect(warnings.length).toBe(1)
  expect(warnings[0]).toContain('keyup')
})

test('keyup on a two-way-bound field does NOT warn (the recommended pattern)', () => {
  const warnings = captureWarnings(() =>
    mount('<input data-bind="value=wk.b" data-event="keyup(Enter):wk.go">'))
  expect(warnings.length).toBe(0)
})

test('keydown on a field WITHOUT a two-way binding does NOT warn', () => {
  const warnings = captureWarnings(() =>
    mount('<div data-event="keydown(Escape):wk.go"></div>'))
  expect(warnings.length).toBe(0)
})

test('modifier keystrokes normalize like b8r (ctrl-KeyS → ctrl-S)', async () => {
  const root = mount('<input class="s" data-event="keydown(ctrl-KeyS):ev.save">')
  await tick()
  fireKey(root.querySelector('.s'), 'KeyS')                    // no ctrl
  expect(save).toBe(0)
  fireKey(root.querySelector('.s'), 'KeyS', { ctrlKey: true }) // ctrl-S
  expect(save).toBe(1)
})
