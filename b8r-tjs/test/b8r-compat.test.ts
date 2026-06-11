// b8r → tosijs compatibility: legacy b8r `data-bind` / `data-event` markup,
// wired onto the tosijs binding engine. Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { tosi } = await import('tosijs')
const { hydrateB8r } = await import('../src/b8r-compat.tjs')

const { app } = tosi({
  app: {
    msg: 'hello',
    tip: 'a tooltip',
    active: true,
    color: 'red',
    visible: true,
    field: 'typed',
    count: 0,
    inc: () => { app.count = app.count + 1 }
  }
})

function mount (html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  hydrateB8r(root)
  return root
}

test('text binding reflects state and updates on change', async () => {
  const root = mount('<span class="m" data-bind="text=app.msg"></span>')
  await tick()
  expect(root.querySelector('.m').textContent).toBe('hello')
  app.msg = 'world'; await tick()
  expect(root.querySelector('.m').textContent).toBe('world')
})

test('attr / style / class targets (with arguments) wire through', async () => {
  const root = mount(
    '<a class="a" data-bind="attr(title)=app.tip"></a>' +
    '<div class="s" data-bind="style(color)=app.color"></div>' +
    '<div class="c" data-bind="class(active)=app.active"></div>'
  )
  await tick()
  expect(root.querySelector('.a').getAttribute('title')).toBe('a tooltip')
  expect(root.querySelector('.s').style.color).toBe('red')
  expect(root.querySelector('.c').classList.contains('active')).toBe(true)
  app.active = false; await tick()
  expect(root.querySelector('.c').classList.contains('active')).toBe(false)
})

test('showIf toggles display', async () => {
  const root = mount('<div class="v" data-bind="showIf=app.visible"></div>')
  await tick()
  expect(root.querySelector('.v').style.display).toBe('')
  app.visible = false; await tick()
  expect(root.querySelector('.v').style.display).toBe('none')
})

test('value binding fills an input from state', async () => {
  const root = mount('<input class="f" data-bind="value=app.field">')
  await tick()
  expect(root.querySelector('.f').value).toBe('typed')
})

test('data-event dispatches to a handler resolved by path', async () => {
  const root = mount(
    '<button class="b" data-event="click:app.inc"></button>' +
    '<span class="n" data-bind="text=app.count"></span>'
  )
  await tick()
  expect(root.querySelector('.n').textContent).toBe('0')
  root.querySelector('.b').click(); await tick()
  expect(root.querySelector('.n').textContent).toBe('1')
  root.querySelector('.b').click(); await tick()
  expect(root.querySelector('.n').textContent).toBe('2')
})

test('multiple bindings on one element (semicolon-separated)', async () => {
  const root = mount('<div class="multi" data-bind="text=app.msg; attr(title)=app.tip"></div>')
  await tick()
  const el = root.querySelector('.multi')
  expect(el.textContent).toBe('world')         // app.msg is 'world' by now
  expect(el.getAttribute('title')).toBe('a tooltip')
})
