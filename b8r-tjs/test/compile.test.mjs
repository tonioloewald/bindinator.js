// Tests for the vfs-free component compiler. Run against the built dist/
// (npm test builds first). These prove the core thesis: edited tjs source
// becomes a live, runtime-type-validated ES module with no file and no
// service worker.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compile, toModuleUrl, load } from '../dist/compile.js'

// a self-contained literate component: a typed function (its `count: 0` /
// `by: 1` examples ARE its types) plus a plain component descriptor.
const source = `
export function increment(count: 0, by: 1) {
  return count + by
}

export const component = {
  tag: 'b8r-counter',
  state: { count: 0 },
  increment
}
`

test('compile() emits JavaScript from tjs source', () => {
  const { code } = compile(source)
  assert.match(code, /export const component/)
  assert.match(code, /export function increment/)
})

test('toModuleUrl() produces an importable data: URL', () => {
  assert.ok(toModuleUrl('export const x = 1').startsWith('data:text/javascript,'))
})

test('load() returns a live module — no file, no service worker', async () => {
  const { module } = await load(source)
  assert.equal(module.component.tag, 'b8r-counter')
  assert.equal(module.component.increment(5, 2), 7)
})

test('runtime type-validation survives into the loaded module', async () => {
  const { module } = await load(source)
  const bad = module.component.increment('not a number', 2)
  assert.equal(bad?.name, 'MonadicError')
  assert.equal(bad?.expected, 'integer')
})
