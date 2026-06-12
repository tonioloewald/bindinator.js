// build-docs.mjs — generate the doc-browser `docs` array from source (pragmatic).
//
// A minimal clone of tosijs-ui's `tosijs-ui-docs` CLI: it takes the curated
// markdown pages (the ones with live b8r fiddles) plus the first `/*# … */` doc
// comment of every source file, and emits `demo/vendor/docs.generated.js`. The
// doc-browser renders those as a literate, self-maintaining docs site.
//
// (Bigger idea — see CLAUDE.md "Deferred": a tjs-lang-native version could extract
// docs AND run each file's inline `test`/signature tests, feeding `Doc.testStatus`.)
//
// Output is JSON.stringify'd (not a template literal) so example `${…}` in the
// docs stays literal text rather than being interpolated at generate time.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // demo/
const proj = join(here, '..')

// the first `/*# … */` block (the literate header), trimmed
function extractDoc (source) {
  const match = source.match(/\/\*#([\s\S]*?)\*\//)
  return match ? match[1].replace(/^\r?\n/, '').replace(/\s+$/, '') : null
}

// first markdown heading → nav title (drop a leading "b8r-tjs · " project prefix)
function titleOf (text, fallback) {
  const match = text.match(/^#+\s+(.+)$/m)
  if (!match) return fallback
  return match[1].trim().replace(/^b8r-tjs\s*[·:-]\s*/, '')
}

// curated pages first (these carry the live fiddles), then source API reference
const curated = ['introduction.md', 'b8r-compat.md']
const sourceOrder = ['b8r-compat.js', 'b8r-blueprint.js', 'b8r-elements.js', 'b8r-example.js', 'b8r-component.tjs']

export async function buildDocs () {
  const docs = []

  for (const name of curated) {
    const text = await readFile(join(here, 'docs', name), 'utf8')
    docs.push({ filename: name, title: titleOf(text, name), path: 'demo/docs/' + name, text })
  }

  const srcDir = join(proj, 'src')
  const present = (await readdir(srcDir)).filter((f) => /\.(js|tjs)$/.test(f))
  const ordered = [
    ...sourceOrder.filter((f) => present.includes(f)),
    ...present.filter((f) => !sourceOrder.includes(f)).sort()
  ]
  for (const name of ordered) {
    const text = extractDoc(await readFile(join(srcDir, name), 'utf8'))
    if (text === null) continue
    docs.push({ filename: 'src/' + name, title: titleOf(text, name), path: 'src/' + name, text })
  }

  const out = join(here, 'vendor', 'docs.generated.js')
  await writeFile(out, 'export default ' + JSON.stringify(docs, null, 2) + '\n')
  console.log('generated docs.generated.js (' + docs.length + ' pages)')
  return docs
}

if (import.meta.main) await buildDocs()
