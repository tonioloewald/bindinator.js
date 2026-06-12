// build.mjs — transpile src/**/*.tjs -> dist/**/*.js in a single pass via tjs.
//
// tjs is the whole build: it strips the example-types, injects runtime
// validation, runs any inline `test` blocks, and emits standalone JavaScript
// (each file carries a minimal inline runtime fallback). There is no bundler
// and no TypeScript step — that is the point.

import { tjs } from 'tjs-lang/lang'
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const srcDir = join(root, 'src')
const distDir = join(root, 'dist')

async function * walk (dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield * walk(full)
    else if (entry.name.endsWith('.tjs') || entry.name.endsWith('.js')) yield full
  }
}

async function build () {
  await rm(distDir, { recursive: true, force: true })
  let count = 0
  let failures = 0
  for await (const file of walk(srcDir)) {
    const source = await readFile(file, 'utf8')
    const rel = relative(srcDir, file).replace(/\.tjs$/, '.js')
    const out = join(distDir, rel)
    // Plain `.js` source is copied verbatim — no tjs. (Used for tosijs-proxy glue
    // like the b8r adapter, where tjs's value-semantics transforms — TypeOf,
    // toBool, structural `==` — break interactions with tosijs boxed proxies.)
    if (file.endsWith('.js')) {
      await mkdir(dirname(out), { recursive: true })
      await writeFile(out, source)
      console.log(`✓ ${rel} (plain js)`)
      count++
      continue
    }
    let result
    try {
      result = tjs(source, { filename: rel })
    } catch (err) {
      failures++
      console.error(`✗ ${rel}\n  ${err.message}`)
      continue
    }
    if (result.warnings && result.warnings.length) {
      for (const w of result.warnings) console.warn(`  ! ${rel}: ${w}`)
    }
    // inline `test` blocks run at transpile time; a failure fails the build
    const failed = (result.testResults || []).filter(t => !t.passed)
    if (failed.length) {
      failures++
      console.error(`✗ ${rel} — ${failed.length} inline test(s) failed`)
      for (const t of failed) console.error(`    ✗ ${t.description} (line ${t.line})`)
      continue
    }
    await mkdir(dirname(out), { recursive: true })
    // tjs preserves import specifiers verbatim, so `./x.tjs` survives into the
    // emitted JS. Rewrite relative `.tjs` specifiers to `.js` so the built dist
    // resolves against its sibling `.js` files (bun's dev plugin loads `.tjs`
    // directly and never hits this; a browser/Node loading dist does).
    const code = result.code.replace(
      /((?:from|import)\s*\(?\s*['"])([^'"]+)\.tjs(['"])/g,
      '$1$2.js$3'
    )
    await writeFile(out, code)
    const tests = result.testCount ? ` (${result.testCount} inline test(s) ✓)` : ''
    console.log(`✓ ${rel}${tests}`)
    count++
  }
  console.log(`\nbuilt ${count} file(s) into dist/${failures ? `, ${failures} failed` : ''}`)
  if (failures) process.exit(1)
}

build()
