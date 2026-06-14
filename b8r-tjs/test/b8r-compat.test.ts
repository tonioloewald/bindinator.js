// b8r → tosijs compatibility: legacy b8r `data-bind` / `data-event` markup,
// wired onto the tosijs binding engine. Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
const { tosi } = await import('tosijs')
const { hydrateB8r, registerB8rBindings } = await import('../src/b8r-compat.js')

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

test('${...} interpolation watches every referenced path and re-renders', async () => {
  const { who } = tosi({ who: { first: 'Ada', last: 'Lovelace', n: 1 } })
  const root = mount(
    '<span class="greet" data-bind="text=Hello ${who.first} ${who.last}!"></span>' +
    '<span class="cnt" data-bind="text=#${who.n}"></span>' +
    '<a class="lnk" data-bind="attr(title)=user ${who.first}"></a>'
  )
  await tick()
  expect(root.querySelector('.greet').textContent).toBe('Hello Ada Lovelace!')
  expect(root.querySelector('.cnt').textContent).toBe('#1')
  expect(root.querySelector('.lnk').getAttribute('title')).toBe('user Ada')
  // changing ANY referenced path re-renders the whole template
  who.last = 'Byron'; who.n = 2; await tick()
  expect(root.querySelector('.greet').textContent).toBe('Hello Ada Byron!')
  expect(root.querySelector('.cnt').textContent).toBe('#2')
})

test('a lone ${path} passes the raw value through (number stays a number)', async () => {
  const { box } = tosi({ box: { count: 0 } })
  const root = mount('<span class="v" data-bind="text=${box.count}"></span>')
  await tick()
  expect(root.querySelector('.v').textContent).toBe('0')
  box.count = 42; await tick()
  expect(root.querySelector('.v').textContent).toBe('42')
})

test('multiple bindings on one element (semicolon-separated)', async () => {
  const root = mount('<div class="multi" data-bind="text=app.msg; attr(title)=app.tip"></div>')
  await tick()
  const el = root.querySelector('.multi')
  expect(el.textContent).toBe('world')         // app.msg is 'world' by now
  expect(el.getAttribute('title')).toBe('a tooltip')
})

test('multi-target binding: one path drives several targets (text,attr(title))', async () => {
  const root = mount('<a class="mt" data-bind="text,attr(title)=app.tip"></a>')
  await tick()
  const el = root.querySelector('.mt')
  expect(el.textContent).toBe('a tooltip')
  expect(el.getAttribute('title')).toBe('a tooltip')
})

test('method binding: a dotted target path is called as fn(element, value)', async () => {
  const calls: any[] = []
  tosi({ form: { value: 'v1', render: (element: any, value: any) => { calls.push([element.classList.contains('meth'), value]); element.dataset.rendered = value } } })
  const root = mount('<div class="meth" data-bind="form.render=form.value"></div>')
  await tick()
  expect(calls.length).toBe(1)
  expect(calls[0]).toEqual([true, 'v1'])   // (element, rawValue)
  expect(root.querySelector('.meth').dataset.rendered).toBe('v1')
})

test('unknown target warns once and is skipped', async () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
  try {
    mount('<div data-bind="bogusTarget=app.msg"></div>')
    mount('<div data-bind="bogusTarget=app.tip"></div>') // same target again → deduped
  } finally { console.warn = original }
  expect(warnings.length).toBe(1)
  expect(warnings[0]).toContain('bogusTarget')
})

test('registerB8rBindings adds a custom target (tree-shakeable extension point)', async () => {
  registerB8rBindings({ bindings: { upper: { toDOM (element: any, value: any) { element.textContent = String(value).toUpperCase() } } } })
  const root = mount('<span class="up" data-bind="upper=app.msg"></span>')
  await tick()
  expect(root.querySelector('.up').textContent).toBe('WORLD') // app.msg is 'world'
})
