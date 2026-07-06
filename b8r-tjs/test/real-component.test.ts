// Port-validation: a REAL, UNMODIFIED b8r component from the parent repo
// (components/todo-simple.js — the "React comparison" demo) mounted via the
// blueprint loader. This is the living proof that the compat surface runs actual
// b8r components, not just synthetic tests. Findings from this exercise are
// recorded in COMPATIBILITY.md.
import { test, expect } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
await import('tosijs')
const { makeComponent } = await import('../src/b8r-blueprint.js')
const { loadB8rComponent } = await import('../src/b8r-component.tjs')
const todoSimple = await import('../../components/todo-simple.js')

function fireInput (el: any, value: string) {
  el.value = value
  el.dispatchEvent(new (document as any).defaultView.Event('input', { bubbles: true }))
}

test('todo-simple mounts, adds items via the button, and clears the field', async () => {
  const todo = makeComponent(todoSimple.default, { name: 'todo-simple' })
  const el = todo()
  document.body.append(el)
  await tick()

  expect(el.querySelector('h3').textContent).toBe('To Do List')
  const input: any = el.querySelector('input')
  const button: any = el.querySelector('button')
  expect(button.disabled).toBe(true)              // enabledIf: empty text → disabled

  fireInput(input, 'buy milk')
  await tick()
  expect(button.disabled).toBe(false)             // text present → enabled

  button.click()
  await tick()
  const rows = [...el.querySelectorAll('ol li')].map((li: any) => li.textContent)
  expect(rows).toEqual(['buy milk'])
  expect(input.value).toBe('')                    // add() cleared the field

  fireInput(input, 'walk dog')
  await tick()
  button.click()
  await tick()
  expect([...el.querySelectorAll('ol li')].map((li: any) => li.textContent))
    .toEqual(['buy milk', 'walk dog'])
})

test('events.component.html (legacy html form) runs unmodified', async () => {
  // exercises: b8r.register, ABSOLUTE-path b8r.get/b8r.set, `${path}`
  // interpolation, and the snake_case `show_if` target — all from real markup.
  const source = await readFile(new URL('../../components/events.component.html', import.meta.url), 'utf8')
  const mount = loadB8rComponent(source)
  const target = document.createElement('div')
  document.body.append(target)
  await mount(target)
  await tick()

  const p: any = target.querySelector('p')
  expect(p.style.display).toBe('none')            // show_if: 0 clicks → hidden

  target.querySelector('button').click()
  await tick()
  expect(p.style.display).toBe('')                // 1 click → shown
  expect(p.textContent).toBe('I have been clicked 1 time(s)')

  target.querySelector('button').click()
  target.querySelector('button').click()
  await tick()
  expect(p.textContent).toBe('I have been clicked 3 time(s)')
})

test('color.component.html runs unmodified (method() bindings, relative imports, b8r.trigger)', async () => {
  // exercises: the `method(_component_.fn)` target form, `input,change` multi-type
  // events, relative dynamic import of ../lib/color.js (via options.base), the
  // component-scoped set() object form, and b8r.trigger.
  const url = new URL('../../components/color.component.html', import.meta.url)
  const mount = loadB8rComponent(await readFile(url, 'utf8'), { base: url.href })
  const target = document.createElement('div')
  document.body.append(target)
  let changeEvents = 0
  target.addEventListener('change', () => { changeEvents = changeEvents + 1 })
  await mount(target, { value: '#ff8000' })
  await tick()

  const colorInput: any = target.querySelector('input[type=color]')
  const textInput: any = target.querySelectorAll('input')[1]
  const rangeInput: any = target.querySelector('input[type=range]')
  // the method() bindings ran: color input shows the opaque color, range the alpha
  expect(colorInput.value).toBe('#ff8000')
  expect(rangeInput.value).toBe('1')

  // user picks a new color → update() reads both inputs, sets value, triggers change
  colorInput.value = '#0080ff'
  rangeInput.value = '1'
  colorInput.dispatchEvent(new (document as any).defaultView.Event('input', { bubbles: true }))
  await tick(); await tick()   // update() is async (dynamic import inside)
  expect((textInput as any).value).toBe('#0080ff')   // two-way value binding updated
  expect(changeEvents).toBeGreaterThan(0)            // b8r.trigger('change', component) fired
})

test('clock.component.html runs unmodified (relative import + domInterval)', async () => {
  const url = new URL('../../components/clock.component.html', import.meta.url)
  const mount = loadB8rComponent(await readFile(url, 'utf8'), { base: url.href })
  const target = document.createElement('div')
  document.body.append(target)
  await mount(target)
  // domInterval fires every 100ms and set('time', …) drives the text binding
  await new Promise(resolve => setTimeout(resolve, 180))
  await tick()
  const span: any = target.querySelector('span')
  expect(span.textContent.length).toBeGreaterThan(0)   // a rendered time string
  target.remove()   // domInterval self-cleans once disconnected
})

test('instance-test + hello: real nested composition with transcluded children', async () => {
  // b8r's own composition demo, unmodified: four <b8r-component path="components/hello">
  // instances (one nested inside another's children), markup-children transclusion,
  // per-instance data-greeting, private scopes via register({…}), the `format`
  // target (from the extras module), show_if, and legacy-path declarative loading.
  const { registerExtraB8rTargets } = await import('../src/b8r-targets-extra.js')
  registerExtraB8rTargets()
  const { setComponentPathBase } = await import('../src/b8r-blueprint.js')
  const { defineLegacyComponent } = await import('../src/b8r-component.tjs')
  setComponentPathBase(new URL('../../', import.meta.url).href)   // = the "page" (repo root)
  ;(globalThis as any).alert = () => {}                            // hello's click alerts

  const url = new URL('../../components/instance-test.component.html', import.meta.url)
  defineLegacyComponent('instance-test', await readFile(url, 'utf8'), { base: url.href })
  const target = document.createElement('div')
  target.setAttribute('data-component', 'instance-test')
  document.body.append(target)
  const { hydrateB8rComponents } = await import('../src/b8r-blueprint.js')
  await hydrateB8rComponents(document.body)
  await tick(); await tick()

  // all four hello instances mounted (a, b, d top-level + c nested in b's children)
  const hellos = [...target.querySelectorAll('.hello')]
  expect(hellos.length).toBe(4)

  // transclusion: instance a's markup child lives in its [data-children]
  const a: any = target.querySelector('[data-id="a"]')
  expect(a.querySelector('[data-children] p').textContent).toBe('I am an inherited child')

  // instance c: nested inside b's transcluded children, greeting overridden via data attr
  const b: any = target.querySelector('[data-id="b"]')
  const c: any = b.querySelector('[data-id="c"]')
  expect(c).not.toBe(null)
  expect(c.querySelector('input').value).toBe('Good-Bye')
  expect(c.querySelector('h4').innerHTML).toBe('<b>Good-Bye</b> Component')  // format target
  expect(a.querySelector('h4').innerHTML).toBe('<b>Hello</b> Component')

  // private scopes: clicking a's button twice affects only a
  const aCount: any = a.querySelector('p [data-bind], p span') || a.querySelector('span')
  expect((a.querySelector('p') as any).style.display).toBe('none')   // show_if: 0 clicks
  a.querySelector('button').click()
  a.querySelector('button').click()
  await tick()
  expect((a.querySelector('p') as any).style.display).toBe('')
  expect(a.querySelector('p span').textContent).toBe('2')
  expect((b.querySelector('p') as any).style.display).toBe('none')   // b untouched
})
