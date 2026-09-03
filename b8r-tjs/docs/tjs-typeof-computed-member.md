# tjs bug: `typeof obj[key]` compiles to `(typeof obj)[key]`

**Status:** **FIXED upstream in tjs-lang 0.13.3.**
[tonioloewald/tjs-lang#29](https://github.com/tonioloewald/tjs-lang/issues/29),
closed 2026-08-24. Verified independently against 0.13.9 — the original case and
five variants (nested computed `a[b][c]`, computed-then-dot, dot-then-computed,
call on computed, and ternary position) all lower correctly, so the fix is not
narrow.

**b8r-tjs is still pinned at 0.8.1, where the bug is live**, so the hoisting
workaround in `src/untrusted.tjs` must stay until we upgrade.

### Why we haven't upgraded yet

0.8.1 → 0.13.9 is not a drop-in. Attempted, and it fails 5 of 100 tests with a
single root cause: `AgentVM.run()` now rejects our arguments —

    Input validation failed: args do not match expected schema (op: vm.run)

The signature is unchanged (`run(astOrToken, args?, options?)`), so it is the
**args validation that tightened**: `{ state, event }` no longer satisfies it
for an agent declared `function agent({ state })`. That is a real migration of
how untrusted handlers receive their input, not a version bump, and it wants
doing deliberately with the sandbox's three boundaries re-verified afterwards.

The other failure is `compile.test.ts`'s "type error in edited source is caught
at compile time", which is likely related but was not investigated.

## Summary

tjs lowers `typeof` to a `TypeOf()` call, but binds it to the **object** rather
than to the full member expression when the access is **computed**:

```js
typeof obj[key] !== 'function'      // source
TypeOf(obj)[key] !== 'function'     // emitted   ← wrong
```

`TypeOf(obj)` is the string `'object'`, so `'object'[key]` is `undefined`, and
the comparison is `undefined !== 'function'` — **always true**. Every guard of
this shape silently inverts to "always pass".

This is quiet in the worst way: no parse error, no type error, no warning. The
code reads correctly and does the opposite of what it says.

## Scope — computed access only

Dot access is lowered correctly, which makes the bug easy to miss:

| source | emitted | correct? |
| --- | --- | --- |
| `typeof x` | `TypeOf(x)` | yes |
| `typeof x.foo` | `TypeOf(x.foo)` | yes |
| `typeof x[k]` | `TypeOf(x)[k]` | **no** |

## Environment

Reproduces on **0.13.2 (latest)**, 0.10.1 and 0.8.1 — not a regression, it has
always been there. Verified behaviourally, not just by reading the emitted text:
`keep({ a: 1, fn: () => {}, b: 2 })` returns `["a","fn","b"]` instead of
`["a","b"]`, while the dot form (`typeof x.n === 'number'`) is correct.

## Minimal reproduction

```js
// keep.tjs
export function keep (obj) {
  const out = []
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] !== 'function') out.push(k)
  }
  return out
}
```

```js
import { tjs } from 'tjs-lang/lang'
console.log(tjs(source).code)
// …  if (__tjs.toBool(TypeOf(obj)[k] !== 'function')) out.push(k)
```

### Expected

`keep({ a: 1, fn: () => {} })` → `['a']`

### Actual

`['a', 'fn']` — the filter never removes anything.

## How it surfaced

`src/untrusted.tjs` strips functions from a component's state before handing it
to `structuredClone` for the AJS sandbox. With the filter silently disabled, the
handler wrappers stayed in the snapshot and **every** sandboxed event threw
`DataCloneError` (structuredClone cannot clone a function).

So the failure was loud *here* only by luck — the very next operation happened
to reject the un-filtered value. A guard of this shape in front of anything more
forgiving would just be wrong, quietly.

## Workaround

Hoist the access:

```js
const item = obj[key]
if (typeof item !== 'function') { … }
```

## Suggested fix

Bind the `typeof` lowering to the complete unary operand, including computed
member expressions, so `typeof a[b]` becomes `TypeOf(a[b])` — matching the dot
case, which is already right.
