// bun:test — imports the .tjs source directly via the tjs bun plugin (no build).
// Covers what inline `test` blocks in the .tjs files can't: cross-module behaviour
// and the async data:-URL load path. observe.tjs is self-contained and is fully
// covered by its own inline tests (run during `bun run build`).
import { test, expect } from 'bun:test'
import { compile, toModuleUrl, load } from '../src/compile.tjs'

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
  expect(code).toContain('export const component')
  expect(code).toContain('export function increment')
})

test('toModuleUrl() produces an importable data: URL', () => {
  expect(toModuleUrl('export const x = 1').startsWith('data:text/javascript;base64,')).toBe(true)
})

test('load() returns a live module — no file, no service worker', async () => {
  const { module } = await load(source)
  expect(module.component.tag).toBe('b8r-counter')
  expect(module.component.increment(5, 2)).toBe(7)
})

test('runtime type-validation survives into the loaded module', async () => {
  const { module } = await load(source)
  const bad = module.component.increment('not a number', 2)
  expect(bad?.name).toBe('MonadicError')
  expect(bad?.expected).toBe('integer')
})
