// Opt-in extra binding targets (format / bytes / json / timestamp / img / bgImg),
// registered through the adapter's extension point. Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { tosi } = await import('tosijs')
const { hydrateB8r } = await import('../src/b8r-compat.js')
const { registerExtraB8rTargets } = await import('../src/b8r-targets-extra.js')

registerExtraB8rTargets()

tosi({
  x: {
    md: '**bold** and *italic*',
    size: 2048,
    obj: { a: 1, b: [2, 3] },
    when: new Date(0),
    pic: 'cat.png'
  }
})

function mount (html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  hydrateB8r(root)
  return root
}

test('format renders light markdown to innerHTML', async () => {
  const root = mount('<p class="f" data-bind="format=x.md"></p>')
  await tick()
  expect(root.querySelector('.f').innerHTML).toBe('<b>bold</b> and <i>italic</i>')
})

test('bytes renders a human-readable size', async () => {
  const root = mount('<span class="b" data-bind="bytes=x.size"></span>')
  await tick()
  expect(root.querySelector('.b').textContent).toBe('2.0 KB')
})

test('json renders a pretty-printed (unboxed) value', async () => {
  const root = mount('<pre class="j" data-bind="json=x.obj"></pre>')
  await tick()
  expect(root.querySelector('.j').textContent).toBe(JSON.stringify({ a: 1, b: [2, 3] }, null, 2))
})

test('timestamp renders a date (non-empty)', async () => {
  const root = mount('<time class="t" data-bind="timestamp=x.when"></time>')
  await tick()
  expect(root.querySelector('.t').textContent).toContain('1970')
})

test('img sets src (direct fallback where there is no Image constructor)', async () => {
  const root = mount('<img class="i" data-bind="img=x.pic">')
  await tick()
  expect(root.querySelector('.i').getAttribute('src')).toBe('cat.png')
})

test('bgImg sets background-image', async () => {
  const root = mount('<div class="g" data-bind="bgImg=x.pic"></div>')
  await tick()
  expect((root.querySelector('.g') as any).style.backgroundImage).toBe('url(cat.png)')
})

test('href sets/removes the attribute', async () => {
  const { lnk } = tosi({ lnk: { url: '/docs' } }) as any
  const root = mount('<a class="l" data-bind="href=lnk.url">x</a>')
  await tick()
  expect(root.querySelector('.l').getAttribute('href')).toBe('/docs')
  lnk.url = ''; await tick()
  expect(root.querySelector('.l').hasAttribute('href')).toBe(false)
})

test('pointerEventsIf toggles pointer-events', async () => {
  const { pe } = tosi({ pe: { on: false } }) as any
  const root = mount('<div class="pe" data-bind="pointerEventsIf=pe.on"></div>')
  await tick()
  expect((root.querySelector('.pe') as any).style.pointerEvents).toBe('none')
  pe.on = true; await tick()
  expect((root.querySelector('.pe') as any).style.pointerEvents).toBe('auto')
})

test('data(key) sets and deletes dataset entries', async () => {
  const { ds } = tosi({ ds: { tag: 'alpha' } }) as any
  const root = mount('<div class="ds" data-bind="data(tag)=ds.tag"></div>')
  await tick()
  expect((root.querySelector('.ds') as any).dataset.tag).toBe('alpha')
  ds.tag = null; await tick()
  expect((root.querySelector('.ds') as any).dataset.tag).toBe(undefined)
})
