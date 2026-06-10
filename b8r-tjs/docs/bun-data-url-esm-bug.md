# bun bug: `data:` JS modules collapse ESM → CJS when an exported binding gets a property

**Status:** not yet filed upstream (`oven-sh/bun`). Workaround in place: `src/compile.tjs`
`toModuleUrl` base64-encodes the `data:` URL.

## Summary

Under bun, `import()` of a **non-base64** `data:text/javascript` URL returns
`{ __esModule, default }` instead of the module's named exports **when the module
assigns a property to an exported binding** (e.g. `f.meta = {…}`). The module is
silently treated as CommonJS; all named exports vanish. Base64-encoded `data:`
URLs are unaffected. Node and browsers handle every form correctly.

This matters for the whole tjs ecosystem: tjs emits `fn.__tjs = { … }` metadata on
every typed function, so **any** tjs-compiled module imported via a percent-encoded
`data:` URL hits this — which is the natural way to load transpiled code in the
browser/playground without a file.

## Environment

- bun 1.3.11, Linux x64

## Minimal reproduction

```ts
const code = 'export function f(){}\nf.m = 1\nexport const x = 1\n'

// percent-encoded (RFC 2397, non-base64)
const percent = await import('data:text/javascript,' + encodeURIComponent(code))
console.log(Object.keys(percent)) // bun: ["__esModule","default"]   node: ["f","x"]

// base64
const bytes = new TextEncoder().encode(code)
let bin = ''; for (const b of bytes) bin += String.fromCharCode(b)
const base64 = await import('data:text/javascript;base64,' + btoa(bin))
console.log(Object.keys(base64)) // bun: ["f","x"]  (correct)
```

### Expected

`["f", "x"]` for both forms (the module is unambiguously ESM — it has `export`
statements).

### Actual (bun)

- percent-encoded / raw / `;charset=utf-8` → `["__esModule", "default"]` (CJS collapse)
- base64 → `["f", "x"]` (correct)

## Notes

- Trigger is specifically a **member assignment on an exported binding**
  (`export function f(){}; f.m = 1`). `export const`/`function`/`class` *without*
  such an assignment round-trip fine under percent-encoding.
- Raw/unencoded data URLs are independently unsafe (a `#` in the source is parsed
  as a URL fragment; `%` as an escape), so base64 is the correct portable choice
  regardless of this bug.
