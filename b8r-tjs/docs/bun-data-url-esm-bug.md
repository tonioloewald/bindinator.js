# bun bug: `data:` JS modules collapse ESM → CJS when an exported binding gets a property

**Status:** Filed upstream — [oven-sh/bun#32057](https://github.com/oven-sh/bun/issues/32057).
**Still present in bun 1.4.0**, confirmed on the issue
([comment](https://github.com/oven-sh/bun/issues/32057#issuecomment-5536476084)).
(Re-checked: a percent-encoded module still
collapses to `["__esModule","default"]`). Workaround in place: `src/compile.tjs`
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
- **`data:`-URL-specific.** The *identical* source in a `.mjs`/`.js` file imports
  correctly (`["f","x"]`); only the `data:` URL collapses. So it is not a general
  CJS-detection problem — it is in the `data:` module path.
- **MIME type is irrelevant.** `text/javascript`, `application/javascript`,
  `text/ecmascript`, `application/ecmascript`, `;charset=utf-8`, and even no MIME
  (`data:,…`) all collapse under percent-encoding. The only axis that matters is
  the **encoding**: percent → CJS collapse, base64 → correct ESM. (So the fix is
  not "declare the right MIME"; it is "base64-encode".)
- Raw/unencoded data URLs are independently unsafe (a `#` in the source is parsed
  as a URL fragment; `%` as an escape), so base64 is the correct portable choice
  regardless of this bug.

---

# bun bug 2: long `data:` modules fail to resolve — `NameTooLong`

**Status:** **FIXED in bun 1.4.0** — not filed, no longer needed. Re-verified on
1.4.0: a 2 MB `data:` module imports fine, as does a real tjs-emitted component
over `data:` directly. It failed past a few kB on 1.3.14.

The `blob:` preference in `src/compile.tjs` **stays** regardless:
- anyone on bun < 1.4 still needs it;
- browsers cap `data:` URL length, and `blob:` is a constant ~41 chars;
- it costs nothing — the `data:` path remains as the fallback node requires.

## Summary

A **second, independent** bun defect in the same subsystem. Above is about
*encoding*; this one is about *length*. Under bun, `import()` of a `data:` URL
fails once the payload passes a few kB — bun routes the URL through **package**
resolution and hits the OS filename limit:

```
error: NameTooLong while resolving package 'data:text/javascript;base64,…'
```

Base64 vs percent-encoding makes no difference, so the workaround for bug 1 does
not help here. This bites b8r-tjs on every real component, because tjs prepends
its runtime preamble (the `MonadicError`/`typeError` boilerplate) to every module,
pushing even a trivial component well past the threshold.

## Environment

- bun 1.3.14 (macOS arm64) — **broken**
- bun 1.4.0 — **fixed** (verified to 2 MB)
- node v22.22.1 — unaffected at any size
- Chrome — unaffected; a 533 kB `data:` URL imports fine

## Minimal reproduction

```js
const mk = (n) => `export const hi = () => 42\n// ${'x'.repeat(n)}`
const asData = (code) =>
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')

await import(asData(mk(100)))    // ok
await import(asData(mk(5000)))   // bun: NameTooLong  |  node: ok
```

### Expected

Import succeeds regardless of payload size (as in node and browsers).

### Actual (bun)

| payload | `data:` | `blob:` |
| --- | --- | --- |
| ~100 B | ok | ok |
| ~5 kB | **NameTooLong** | ok |
| ~200 kB | **NameTooLong** | ok |

## Notes

- **`blob:` is immune** because the code lives in the object store, not the URL —
  the URL is a constant ~41 chars at any module size. That is why `load()` prefers
  it.
- **The inverse holds in node**, which is why both paths are kept: node's ESM
  loader accepts only `file`/`data`/`node` schemes, so `blob:` throws there and
  `data:` (fine at any size) is the fallback.
- **Don't feature-detect `URL.createObjectURL` to choose.** Node *has* it but
  cannot import the result; `compile.tjs` probes by actually importing a tiny
  throwaway blob module once and caching the answer.
