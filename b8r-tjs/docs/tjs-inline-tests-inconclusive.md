# tjs: inline `test` blocks silently don't run for indented or arrow-default sources

**Status:** Filed — [tonioloewald/tjs-lang#50](https://github.com/tonioloewald/tjs-lang/issues/50).
Found while upgrading b8r-tjs to 0.13.9.
Pinned by three tests in `test/live-edit.test.ts`.

## Summary

An inline `test` block that cannot be executed comes back **`inconclusive`**
rather than failing, and `tjs()` does **not** throw. Two ordinary conditions
trigger it:

1. the module's **default export is an arrow function**
2. the **source is indented**

In both cases the result is `{ passed: false, inconclusive: true, error: "Module
could not be executed for testing: …" }`. Compilation succeeds and the emitted
code is fine — only the tests are skipped.

This is quiet in a way that matters: a caller that checks "did anything throw?"
or counts failures sees a clean run and concludes the tests passed. They never
ran.

## Why it bites

Both conditions are the *normal* case for the feature inline tests most support —
live editing and literate docs:

- b8r-tjs's live-edit contract is `export default (lib) => spec`, **an arrow**.
  So inline tests inside an edited component are inconclusive by construction.
- Any source embedded in a template literal inside indented code is **indented**.
  That is every fixture, every docs example, every editor default.

## Environment

- tjs-lang 0.13.9

## Reproduction

```js
import { tjs } from 'tjs-lang/lang'

const body = [
  "export function inc(count: 0) { return count + 1 }",
  "test 'oops' { expect(inc('not a number')).toBe(1) }",
]

// (a) flush-left, named default export -> THROWS, as intended
tjs([...body, 'function factory () { return {} }', 'export default factory'].join('\n'))
//   Transpile-time test failures: Test 'oops' (line 2) failed: Expected 1 but got MonadicError

// (b) same, but default export is an arrow -> RETURNS, inconclusive
tjs([...body, 'export default () => ({})'].join('\n')).testResults
//   [{ passed: false, inconclusive: true,
//      error: "Module could not be executed for testing: Unexpected token '=>'" }]

// (c) same as (a), but indented -> RETURNS, inconclusive
tjs(`
    export function inc(count: 0) { return count + 1 }
    test 'oops' { expect(inc('not a number')).toBe(1) }
    function factory () { return {} }
    export default factory
`).testResults
//   [{ passed: false, inconclusive: true,
//      error: "Module could not be executed for testing: Unexpected keyword 'export'" }]
```

### Expected

All three report the same genuine failure — the inline test's expectation is
wrong regardless of how the module is formatted or what shape its default export
takes.

### Actual

Only (a) is reported. (b) and (c) compile cleanly with a skipped test.

## Suggested fixes

- **Dedent the source** before building the test module (the (c) case looks like
  the harness evaluating an indented module body in a context that rejects
  `export`).
- **Handle an arrow default export** when constructing the test module — or, if
  it genuinely cannot be executed, say so at a level a caller will notice.
- Consider making `inconclusive` **loud by default** — a warning, a non-zero
  build gate, or a distinct return channel. Silently downgrading "could not run"
  to a value nobody inspects is the actual hazard here; the two parsing causes
  are just how you reach it.

## Workaround

Write fixtures flush-left with a named function as the default export. b8r-tjs
does this in `test/live-edit.test.ts` and pins all three behaviours so the
limitation cannot regress unnoticed.
