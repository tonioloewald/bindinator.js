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

// The tosijs-ui demos (live-example, doc-browser) use extensionless ESM imports +
// sucrase, so bundle their entries with bun — one shared tosijs instance, sucrase
// inlined. The doc-browser demo imports `.md` docs as text (so their `${…}` is
// literal markdown, not JS interpolation).
async function bundle (entryName, outName, loader) {
  const built = await Bun.build({
    entrypoints: [join(root, entryName)],
    target: 'browser',
    format: 'esm',
    loader
  })
  if (!built.success) {
    for (const log of built.logs) console.error(log)
    throw new Error(`${entryName} bundle failed`)
  }
  await Bun.write(join(out, outName), built.outputs[0])
  console.log('bundled', outName)
}
await bundle('live-example.entry.js', 'live-example.bundle.js')
await bundle('docs.entry.js', 'docs.bundle.js', { '.md': 'text' })
