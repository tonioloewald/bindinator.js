// Modern b8r components (ESM-object form) loaded onto tosijs via the blueprint
// loader: view builders, css scoping, initialValue + methods, events, load, and
// redefinition (hot reload). Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
await import('tosijs')
const { defineB8rComponent, mountB8rComponent, makeComponent, loadB8rComponent } = await import('../src/b8r-blueprint.js')

function host () {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

test('mounts a view-builder component, binds text, and runs methods on events', async () => {
  let loaded = 0
  const counter = {
    css: '._component_ .out { font-weight: bold; }',
    view: ({ div, span, button }: any) => div(
      span({ class: 'out', bindText: '_component_.count' }),
      button('inc', { class: 'btn', onClick: '_component_.inc' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0,
      inc: () => { component.data.count = component.data.count + 1 }
    }),
    load: () => { loaded = loaded + 1 }
  }
  const entry = defineB8rComponent('counter', counter)
  const target = host()
  await entry.mount(target)
  await tick()

  expect(loaded).toBe(1)
  expect(target.querySelector('.out').textContent).toBe('0')
  // css was scoped and installed
  expect([...document.querySelectorAll('style')].some(
    (s: any) => s.textContent.includes('.counter-component .out'))).toBe(true)

  target.querySelector('.btn').click()
  await tick()
  expect(target.querySelector('.out').textContent).toBe('1')
  target.querySelector('.btn').click()
  await tick()
  expect(target.querySelector('.out').textContent).toBe('2')
})

function installedStyles () {
  return [...document.querySelectorAll('style')].map((s: any) => s.textContent).join('\n')
}

test('css may be a function receiving tosijs css/vars/varDefault (like view)', async () => {
  defineB8rComponent('cssfn', {
    css: ({ vars, varDefault }: any) =>
      '._component_ b { color: ' + vars.accentColor + '; padding: ' + varDefault.pad('4px') +
      '; width: ' + vars.width50 + '; }',
    view: ({ b }: any) => b('hi')
  })
  await mountB8rComponent(host(), 'cssfn')
  await tick()
  const styles = installedStyles()
  expect(styles).toContain('.cssfn-component b')        // `_component_` still scoped
  expect(styles).toContain('var(--accent-color)')       // vars proxy (camelCase → kebab)
  expect(styles).toContain('var(--pad, 4px)')           // varDefault proxy (with fallback)
  expect(styles).toContain('calc(var(--width) * 0.5)')  // computed var (width50)
})

test('makeComponent returns an element creator; the instance reacts', async () => {
  const counter = makeComponent({
    view: ({ div, span, button }: any) => div(
      span({ class: 'n', bindText: '${_component_.count}' }),
      button('+1', { class: 'inc', onClick: '_component_.inc' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0, inc: () => { component.data.count = component.data.count + 1 }
    })
  })
  expect(typeof counter).toBe('function')   // it's a creator, like elements.div
  const el = counter()
  host().append(el)
  await tick()
  expect(el.querySelector('.n').textContent).toBe('0')
  el.querySelector('.inc').click()
  await tick()
  expect(el.querySelector('.n').textContent).toBe('1')
})

test('makeComponent creator applies prop objects to the root (class, attrs)', async () => {
  const badge = makeComponent({ view: ({ span }: any) => span('hi') })
  const el = badge({ class: 'big', title: 'a tip' })
  host().append(el)
  await tick()
  expect(el.classList.contains('big')).toBe(true)
  expect(el.getAttribute('title')).toBe('a tip')
  expect(el.querySelector('span').textContent).toBe('hi')
})

test('makeComponent slots child nodes into the view’s [data-children] (b8r composition)', async () => {
  const panel = makeComponent({
    view: ({ div }: any) => div({ class: 'panel' }, div({ class: 'body', dataChildren: true }))
  })
  const el = panel({ class: 'outer' }, document.createElement('h2'), 'tail text')
  el.querySelector('h2').textContent = 'Title'
  host().append(el)
  await tick()
  const body = el.querySelector('.body')
  expect(body.querySelector('h2').textContent).toBe('Title')  // children transcluded
  expect(body.textContent).toContain('tail text')
})

test('makeComponent warns when given children but the view has no [data-children]', async () => {
  const warnings: string[] = []
  const original = console.warn
  console.warn = (...args: any[]) => { warnings.push(args.join(' ')) }
  try {
    const plain = makeComponent({ name: 'no-slot', view: ({ span }: any) => span('hi') })
    host().append(plain({}, document.createElement('em')))  // children, but nowhere to put them
    await tick()
  } finally { console.warn = original }
  expect(warnings.length).toBe(1)
  expect(warnings[0]).toContain('data-children')
})

test('makeComponent options: name, tag, and initial data', async () => {
  const item = makeComponent(
    { view: ({ b }: any) => b({ class: 'v', bindText: '_component_.label' }) },
    { name: 'named-item', tag: 'section', data: { label: 'seeded' } }
  )
  const el = item()
  host().append(el)
  await tick()
  expect(el.tagName).toBe('SECTION')
  expect(el.classList.contains('named-item-component')).toBe(true)
  expect(el.querySelector('.v').textContent).toBe('seeded')
})

test('instances are isolated: each mount gets its own state', async () => {
  const counter = makeComponent({
    view: ({ span, button }: any) => span(
      span({ class: 'n', bindText: '_component_.count' }),
      button({ class: 'inc', onClick: '_component_.inc' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0, inc: () => { component.data.count = component.data.count + 1 }
    })
  })
  const a = counter()
  const b = counter()
  host().append(a, b)
  await tick()
  a.querySelector('.inc').click()
  a.querySelector('.inc').click()
  await tick()
  expect(a.querySelector('.n').textContent).toBe('2')
  expect(b.querySelector('.n').textContent).toBe('0')   // untouched
})

test('redefining swaps the stylesheet in place (no duplicates)', async () => {
  defineB8rComponent('restyle', { css: '._component_ { color: red }', view: ({ i }: any) => i('x') })
  defineB8rComponent('restyle', { css: '._component_ { color: blue }', view: ({ i }: any) => i('x') })
  const styles = installedStyles()
  expect(styles).toContain('.restyle-component { color: blue }')
  expect(styles).not.toContain('.restyle-component { color: red }')  // old sheet removed
})

test('loadB8rComponent accepts a module namespace (default export)', async () => {
  const module = { default: { view: ({ em }: any) => em({ class: 'm' }, 'mod') } }
  loadB8rComponent('from-module', module)
  const target = host()
  await mountB8rComponent(target, 'from-module')
  await tick()
  expect(target.querySelector('.m').textContent).toBe('mod')
})

test('the instance context: get/set/find/findOne/on/component', async () => {
  let ctx: any
  defineB8rComponent('ctxprobe', {
    view: ({ input }: any) => input({ class: 'f' }),
    initialValue: { a: 1 },
    load: (c: any) => { ctx = c }
  })
  const target = host()
  const id = await mountB8rComponent(target, 'ctxprobe')
  await tick()
  expect(ctx.get('a')).toBe(1)
  ctx.set('a', 2)
  expect(ctx.get('a')).toBe(2)
  ctx.set({ a: 3, b: 4 })                       // object form
  expect(ctx.get()).toMatchObject({ a: 3, b: 4 })
  expect(ctx.findOne('.f')).toBe(target.querySelector('.f'))
  expect(ctx.find('.f').length).toBe(1)
  expect(ctx.component.element).toBe(target)
  expect(ctx.component.id).toBe(id)
  expect(typeof ctx.getListInstance).toBe('function')
  // on(): delegated handler resolves through the instance scope
  let hits = 0
  ctx.set('go', () => { hits = hits + 1 })
  ctx.on('click', '_component_.go')
  target.dispatchEvent(new (document as any).defaultView.Event('click', { bubbles: true }))
  expect(hits).toBe(1)
})

test('css may be an XinStyleSheet object (stringified via tosijs css())', async () => {
  defineB8rComponent('cssobj', {
    css: ({ vars }: any) => ({ '._component_ i': { color: vars.brand } }),
    view: ({ i }: any) => i('x')
  })
  await mountB8rComponent(host(), 'cssobj')
  await tick()
  const styles = installedStyles()
  expect(styles).toContain('.cssobj-component i')
  expect(styles).toContain('var(--brand)')
})

test('redefining a component hot-reloads live instances, preserving their data', async () => {
  const v1 = {
    view: ({ span }: any) => span({ class: 'label', bindText: '_component_.n' }),
    initialValue: { n: 7 }
  }
  defineB8rComponent('hot', v1)
  const target = host()
  await mountB8rComponent(target, 'hot')
  await tick()
  expect(target.querySelector('.label').textContent).toBe('7')

  // redefine with a different view; the live instance re-stamps but keeps n=7
  const v2 = {
    view: ({ b }: any) => b({ class: 'label2', bindText: '_component_.n' }),
    initialValue: { n: 0 }
  }
  defineB8rComponent('hot', v2)
  await tick()
  expect(target.querySelector('.label')).toBe(null)            // old view gone
  expect(target.querySelector('.label2').textContent).toBe('7') // data preserved
})

test('supports the html-string form with a legacy <script> load body', async () => {
  const spec = {
    html: '<p class="msg" data-bind="text=_component_.message"></p>',
    initialValue: { message: 'hi' },
    load: 'set("message", get("message") + " there")'
  }
  defineB8rComponent('greeter', spec)
  const target = host()
  await mountB8rComponent(target, 'greeter')
  await tick()
  expect(target.querySelector('.msg').textContent).toBe('hi there')
})
