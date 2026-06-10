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
    else if (entry.name.endsWith('.tjs')) yield full
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
    await writeFile(out, result.code)
    const tests = result.testCount ? ` (${result.testCount} inline test(s) ✓)` : ''
    console.log(`✓ ${rel}${tests}`)
    count++
  }
  console.log(`\nbuilt ${count} file(s) into dist/${failures ? `, ${failures} failed` : ''}`)
  if (failures) process.exit(1)
}

build()
