// Legacy b8r `.component.html` running on the tosijs engine via the loader.
// Headless (linkedom + tosijs). Includes a REAL component file from this repo.
import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { loadB8rComponent } = await import('../src/b8r-component.tjs')

// a synthetic legacy component: docs + style + data-bind/data-event + a script
const counterSource = `<!--
# Legacy Counter
-->
<style>
  .greeting { font-weight: bold; }
</style>
<div>
  <span class="greeting" data-bind="text=_component_.greeting"></span>
  <span class="n" data-bind="text=_component_.count"></span>
  <button class="bump" data-event="click:_component_.bump"></button>
</div>
<script>
  set({
    greeting: 'hello',
    count: 0,
    bump: () => set('count', get('count') + 1)
  })
</script>
`

const newTarget = () => {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

test('a legacy b8r component (markup + data-bind + script) runs on tosijs', async () => {
  const mount = loadB8rComponent(counterSource)
  const target = newTarget()
  await mount(target, {})
  await tick()
  expect(target.querySelector('.greeting').textContent).toBe('hello')
  expect(target.querySelector('.n').textContent).toBe('0')

  // the legacy data-event + script handler works end to end
  target.querySelector('.bump').click(); await tick()
  expect(target.querySelector('.n').textContent).toBe('1')
  target.querySelector('.bump').click(); await tick()
  expect(target.querySelector('.n').textContent).toBe('2')
})

test('instances are independent', async () => {
  const mount = loadB8rComponent(counterSource)
  const a = newTarget()
  const b = newTarget()
  await mount(a, {})
  await mount(b, {})
  await tick()
  a.querySelector('.bump').click(); await tick()
  expect(a.querySelector('.n').textContent).toBe('1')
  expect(b.querySelector('.n').textContent).toBe('0')
})

test('a REAL legacy component file from the repo loads and binds', async () => {
  // components/input.component.html: `<input data-bind="value=_component_.value">`
  const path = fileURLToPath(new URL('../../components/input.component.html', import.meta.url))
  const source = readFileSync(path, 'utf8')
  const mount = loadB8rComponent(source)
  const target = newTarget()
  await mount(target, { value: 'from b8r' })
  await tick()
  expect(target.querySelector('input').value).toBe('from b8r')
})
