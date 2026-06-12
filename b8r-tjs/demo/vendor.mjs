// Copy tjs-lang/lang + its deps out of node_modules into demo/vendor/ so the
// live-edit demo can load tjs in the browser with NO network (offline / CI-safe).
// In production you'd instead use a CDN that flattens deps — the tjs playground
// uses JSDelivr `/+esm` for dynamic, version-pinned imports.
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const nm = join(root, '..', 'node_modules')
const out = join(root, 'vendor')
await mkdir(out, { recursive: true })
const files = [
  ['tjs-lang/dist/tjs-lang.js', 'tjs-lang.js'],
  ['acorn/dist/acorn.mjs', 'acorn.mjs'],
  ['tosijs-schema/dist/index.js', 'tosijs-schema.js'],
  ['tosijs/dist/module.js', 'tosijs.js']
]
for (const [src, dst] of files) {
  await copyFile(join(nm, src), join(out, dst))
  console.log('vendored', dst)
}
