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

test('snake_case target names camelize like b8r (show_if → showIf)', async () => {
  const { sn } = tosi({ sn: { on: false } }) as any
  const root = mount('<div class="sn" data-bind="show_if=sn.on"></div>')
  await tick()
  expect((root.querySelector('.sn') as any).style.display).toBe('none')
  sn.on = true; await tick()
  expect((root.querySelector('.sn') as any).style.display).toBe('')
})

test('method(path) is the explicit form of the dotted-LHS method binding', async () => {
  const got: any[] = []
  tosi({ mfn: { value: 'v2', paint: (element: any, value: any) => { got.push(value); element.dataset.painted = value } } })
  const root = mount('<div class="mf" data-bind="method(mfn.paint)=mfn.value"></div>')
  await tick()
  expect(got).toEqual(['v2'])
  expect((root.querySelector('.mf') as any).dataset.painted).toBe('v2')
})

test('{{mustache}} in a bind value warns and is skipped (static content kept)', async () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
  let root: any
  try {
    root = mount('<button class="mu" data-bind="text=Add #{{app.n}}">Static</button>')
    await tick()
  } finally { console.warn = original }
  expect(root.querySelector('.mu').textContent).toBe('Static')  // not emptied
  expect(warnings.length).toBe(1)
  expect(warnings[0]).toContain('${path}')
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

test('selected is a two-way target', async () => {
  const { opt } = tosi({ opt: { chosen: true } })
  const root = mount('<option class="o" data-bind="selected=opt.chosen">x</option>')
  await tick()
  expect((root.querySelector('.o') as any).selected).toBe(true)
  opt.chosen = false; await tick()
  expect((root.querySelector('.o') as any).selected).toBe(false)
})

test('two-way value: an input event writes DOM → state', async () => {
  const { tw } = tosi({ tw: { text: 'start' } })
  const root = mount('<input class="w" data-bind="value=tw.text">')
  await tick()
  const input: any = root.querySelector('.w')
  expect(input.value).toBe('start')
  input.value = 'typed'
  input.dispatchEvent(new (document as any).defaultView.Event('input', { bubbles: true }))
  await tick()
  expect((tw.text as any).valueOf()).toBe('typed')
})

test('two-way checked: a change event writes DOM → state', async () => {
  const { cb } = tosi({ cb: { on: false } })
  const root = mount('<input type="checkbox" class="cb" data-bind="checked=cb.on">')
  await tick()
  const box: any = root.querySelector('.cb')
  expect(box.checked).toBe(false)
  box.checked = true
  box.dispatchEvent(new (document as any).defaultView.Event('change', { bubbles: true }))
  await tick()
  expect((cb.on as any).valueOf()).toBe(true)
})

test('hideIf / enabledIf / disabledIf / prop targets', async () => {
  const { st } = tosi({ st: { hide: true, ok: false, tabIndex: 3 } })
  const root = mount(
    '<div class="h" data-bind="hideIf=st.hide"></div>' +
    '<button class="e" data-bind="enabledIf=st.ok"></button>' +
    '<button class="d" data-bind="disabledIf=st.ok"></button>' +
    '<div class="p" data-bind="prop(tabIndex)=st.tabIndex"></div>'
  )
  await tick()
  expect((root.querySelector('.h') as any).style.display).toBe('none')
  expect((root.querySelector('.e') as any).disabled).toBe(true)   // not ok → disabled
  expect((root.querySelector('.d') as any).disabled).toBe(false)
  expect((root.querySelector('.p') as any).tabIndex).toBe(3)
  st.hide = false; st.ok = true; await tick()
  expect((root.querySelector('.h') as any).style.display).toBe('')
  expect((root.querySelector('.e') as any).disabled).toBe(false)
  expect((root.querySelector('.d') as any).disabled).toBe(true)
})

test('showIf(value) / hideIf(value) match against a specific value', async () => {
  const { mode } = tosi({ mode: { current: 'edit' } })
  const root = mount(
    '<div class="se" data-bind="showIf(edit)=mode.current"></div>' +
    '<div class="hv" data-bind="hideIf(view)=mode.current"></div>'
  )
  await tick()
  expect((root.querySelector('.se') as any).style.display).toBe('')     // current === edit
  expect((root.querySelector('.hv') as any).style.display).toBe('')     // current !== view
  mode.current = 'view'; await tick()
  expect((root.querySelector('.se') as any).style.display).toBe('none')
  expect((root.querySelector('.hv') as any).style.display).toBe('none')
})

test('attr removes the attribute on null/false and sets empty on true', async () => {
  const { at } = tosi({ at: { title: 'tip', flag: true } })
  const root = mount('<a class="at" data-bind="attr(title)=at.title; attr(data-flag)=at.flag"></a>')
  await tick()
  const el = root.querySelector('.at')
  expect(el.getAttribute('title')).toBe('tip')
  expect(el.getAttribute('data-flag')).toBe('')     // true → present, empty
  at.title = null; at.flag = false; await tick()
  expect(el.hasAttribute('title')).toBe(false)
  expect(el.hasAttribute('data-flag')).toBe(false)
})

test('newline-separated data-bind specs work (b8r markup convention)', async () => {
  const root = mount('<div class="nl" data-bind="text=app.msg\nattr(title)=app.tip"></div>')
  await tick()
  const el = root.querySelector('.nl')
  expect(el.textContent).toBe('world')
  expect(el.getAttribute('title')).toBe('a tooltip')
})

test('registerB8rBindings accepts factories (parameterised custom targets)', async () => {
  registerB8rBindings({
    factories: { suffix: (arg: string) => ({ toDOM (element: any, value: any) { element.textContent = value + arg } }) }
  })
  const root = mount('<span class="sfx" data-bind="suffix(!)=app.msg"></span>')
  await tick()
  expect(root.querySelector('.sfx').textContent).toBe('world!')
})

test('registerB8rBindings adds a custom target (tree-shakeable extension point)', async () => {
  registerB8rBindings({ bindings: { upper: { toDOM (element: any, value: any) { element.textContent = String(value).toUpperCase() } } } })
  const root = mount('<span class="up" data-bind="upper=app.msg"></span>')
  await tick()
  expect(root.querySelector('.up').textContent).toBe('WORLD') // app.msg is 'world'
})
