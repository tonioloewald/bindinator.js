// The live-example bridge: renderB8rExample mounts a b8r component spec into a
// target element (as a <live-example> preview would), and b8rExampleContext
// exposes the loader for fiddle js. Headless (linkedom + tosijs).
import { test, expect } from 'bun:test'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
await import('tosijs')
const { renderB8rExample, b8rExampleContext } = await import('../src/b8r-example.js')

test('renderB8rExample mounts a b8r spec into a target (preview) and reacts', async () => {
  const preview = document.createElement('div')
  document.body.append(preview)
  // exactly what a b8r fiddle's js would run, with `preview` injected by live-example
  renderB8rExample(preview, {
    css: '._component_ b { color: rebeccapurple; }',
    view: ({ div, b, button }: any) => div(
      b({ class: 'n', bindText: '${_component_.count}' }),
      button('+1', { class: 'inc', onClick: '_component_.inc' })
    ),
    initialValue: ({ component }: any) => ({
      count: 0,
      inc: () => { component.data.count = component.data.count + 1 }
    })
  })
  await tick()
  expect(preview.querySelector('.n').textContent).toBe('0')
  preview.querySelector('.inc').click()
  await tick()
  expect(preview.querySelector('.n').textContent).toBe('1')
})

test('b8rExampleContext exposes the API only under the `b8r-tjs` namespace', () => {
  // namespace-only, so `import { makeComponent } from 'b8r-tjs'` doesn't collide
  // with a bare injected param of the same name (see b8r-example.js).
  expect(Object.keys(b8rExampleContext)).toEqual(['b8r-tjs'])
  const ns = (b8rExampleContext as any)['b8r-tjs']
  expect(typeof ns.makeComponent).toBe('function')
  expect(typeof ns.defineB8rComponent).toBe('function')
  expect(typeof ns.mountB8rComponent).toBe('function')
  expect(typeof ns.hydrateB8r).toBe('function')
  expect(typeof ns.renderB8rExample).toBe('function')
})
