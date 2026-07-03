// Smoke test against the BUILT dist/ — what the demos and consumers actually
// import. Catches build-pipeline breakage (specifier rewriting, plain-js copy,
// tjs emit) that src/-importing tests can't see. Skipped when dist/ hasn't been
// built (plain `bun test`); `bun run test` builds first, so CI always runs it.
import { test, expect } from 'bun:test'
import { existsSync } from 'node:fs'
import { setupDom, tick } from './_dom.mjs'

const document = setupDom()
await import('tosijs')

const distDir = new URL('../dist/', import.meta.url)
const hasDist = existsSync(new URL('b8r-compat.js', distDir))

test.skipIf(!hasDist)('dist: hydrateB8r binds and reacts', async () => {
  const { tosi } = await import('tosijs')
  const { hydrateB8r } = await import('../dist/b8r-compat.js')
  const { smoke } = tosi({ smoke: { msg: 'built' } }) as any
  const root = document.createElement('div')
  root.innerHTML = '<span class="s" data-bind="text=smoke.msg"></span>'
  document.body.append(root)
  hydrateB8r(root)
  await tick()
  expect(root.querySelector('.s').textContent).toBe('built')
  smoke.msg = 'updated'; await tick()
  expect(root.querySelector('.s').textContent).toBe('updated')
})

test.skipIf(!hasDist)('dist: makeComponent creates a working instance', async () => {
  const { makeComponent } = await import('../dist/b8r-blueprint.js')
  const badge = makeComponent({ view: ({ b }: any) => b({ class: 'db' }, 'dist') })
  const el = badge()
  document.body.append(el)
  await tick()
  expect(el.querySelector('.db').textContent).toBe('dist')
})

test.skipIf(!hasDist)('dist: the tjs-emitted legacy loader resolves its .js imports', async () => {
  // b8r-component.tjs imports ./b8r-compat.js — the build must rewrite/copy so the
  // emitted dist file resolves against its dist siblings.
  const { loadB8rComponent } = await import('../dist/b8r-component.js')
  expect(typeof loadB8rComponent).toBe('function')
})
