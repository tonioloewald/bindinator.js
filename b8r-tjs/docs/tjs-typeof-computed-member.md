# tjs bug: `typeof obj[key]` compiles to `(typeof obj)[key]`

**Status:** **FIXED upstream in tjs-lang 0.13.3.**
[tonioloewald/tjs-lang#29](https://github.com/tonioloewald/tjs-lang/issues/29),
closed 2026-08-24. Verified independently against 0.13.9 — the original case and
five variants (nested computed `a[b][c]`, computed-then-dot, dot-then-computed,
call on computed, and ternary position) all lower correctly, so the fix is not
narrow.

**b8r-tjs now runs ^0.13.9**, so the bug no longer applies here. The hoisting in
`src/untrusted.tjs` is kept for readability, not necessity.

### The upgrade that this unblocked

0.8.1 → 0.13.9 was not a drop-in; it needed one real change. `ajs()` now emits an
`inputSchema` from the agent's declared parameters with
`additionalProperties: false`, so `AgentVM.run()` rejects arguments the agent did
not declare — passing `{ state, event }` to a `function agent({ state })` fails
with *"Input validation failed: args do not match expected schema"*.

That is a good tightening, so `runHandler` adapts to it rather than forcing every
handler to declare `event`: it reads the compiled `inputSchema` and narrows the
input to the keys the agent actually declares (`narrowToSchema`). A missing or
unrecognised schema passes through untouched.

The upgrade also surfaced a separate problem — inline tests silently not running
for indented or arrow-default sources. See
`docs/tjs-inline-tests-inconclusive.md`.

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
