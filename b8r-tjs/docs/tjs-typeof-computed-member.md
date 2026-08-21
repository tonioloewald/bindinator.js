# tjs bug: `typeof obj[key]` compiles to `(typeof obj)[key]`

**Status:** Not yet filed (tjs-lang). Worked around in `src/untrusted.tjs` by
hoisting the member access into a local.

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

- tjs-lang 0.8.1 (as pinned by b8r-tjs)

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
