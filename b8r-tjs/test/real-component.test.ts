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
