// Direct tests for the ported b8r `elements` creator — the authoring surface.
// Mirrors the inline tests b8r's own elements.js carried. Headless (linkedom).
import { test, expect } from 'bun:test'
import { setupDom } from './_dom.mjs'

const document = setupDom()
const { elements, create } = await import('../src/b8r-elements.js')
const { div, span, button, fooBarBaz, _fragment } = elements as any

test('creates elements; camelCase tag names become kebab-case', () => {
  expect(div().tagName).toBe('DIV')
  expect(fooBarBaz().tagName.toLowerCase()).toBe('foo-bar-baz')
})

test('strings and numbers become text nodes; nodes and arrays append', () => {
  const el = div('foo', 42, span('kid'), [span('a'), null, span('b')])
  expect(el.childNodes.length).toBe(5)
  expect(el.childNodes[0].textContent).toBe('foo')
  expect(el.childNodes[1].textContent).toBe('42')
  expect(el.querySelectorAll('span').length).toBe(3)
})

test('bindX props emit data-bind; onX props emit data-event', () => {
  const el = button('go', { bindText: 'foo.bar', bindEnabledIf: 'foo.ok', onClick: 'foo.go' })
  expect(el.dataset.bind).toBe('text=foo.bar\nenabledIf=foo.ok')
  expect(el.dataset.event).toBe('click:foo.go')
})

test('key-qualified onX props survive verbatim (onKeyup(Enter))', () => {
  const el = create('input', { 'onKeyup(Enter)': 'foo.add' })
  expect(el.dataset.event).toBe('keyup(Enter):foo.add')
})

test('a dotted key is a method binding; bindList emits data-list', () => {
  const el = div({ 'app.render': 'app.data', bindList: 'app.rows:id' })
  expect(el.dataset.bind).toBe('app.render=app.data')
  expect(el.dataset.list).toBe('app.rows:id')
})

test('style accepts a string or an object', () => {
  expect(div({ style: 'color: red' }).getAttribute('style')).toContain('red')
  expect((div({ style: { color: 'green' } }) as any).style.color).toBe('green')
})

test('camelCase attributes kebab-case; booleans set presence', () => {
  const el = div({ dataFooBar: 'x', disabled: true, hidden: false })
  expect(el.getAttribute('data-foo-bar')).toBe('x')
  expect(el.hasAttribute('disabled')).toBe(true)
  expect(el.getAttribute('disabled')).toBe('')
  expect(el.hasAttribute('hidden')).toBe(false)
})

test('_fragment collects children into a DocumentFragment', () => {
  const frag = _fragment(span('a'), span('b'))
  expect(frag.nodeType).toBe(11)
  expect(frag.childNodes.length).toBe(2)
})

test('elements proxy memoizes creators and rejects writes', () => {
  expect(elements.div).toBe(elements.div)
  expect(() => { (elements as any).div = null }).toThrow()
})
