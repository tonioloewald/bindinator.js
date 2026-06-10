# Performance cutouts — decision

Principle 5 (`CLAUDE.md`) says perf work is a *fenced exception, only if profiling
demands it*. So this is the profiling, and the decision it leads to.

Benchmark: `bench/observe-bench.mjs` (`bun bench/observe-bench.mjs`), headless.

## Findings (representative run, bun 1.3.11)

```
[1] sync set+notify: 500,000 sets in ~560ms = ~893,000 sets/sec
[2] burst of 1,000 sets x 100 overlapping observers:
    no batch: 100,000 callback fires in ~88ms
    batch:        100 callback fires in ~1.3ms
    -> 1000x fewer callbacks, ~68x faster
```

## Decisions

1. **Keep the default path synchronous and validated.** ~0.9M `set`+notify per
   second, single-threaded, is far past anything a UI needs. The validated path
   is the default; nothing here justifies changing that.

2. **Ship `batch()` as the one performance cutout.** Coalescing a burst of
   changes so each observer fires once is a large, real win (≈1000× fewer
   callback invocations, tens-of-× faster) for bulk updates (loading data,
   applying many changes at once). It is **opt-in** — outside a `batch` the
   default stays synchronous — and **safe** (no validation skipped). Use it when
   you knowingly make many changes in one tick:

   ```js
   batch(() => { for (const row of rows) set(`data.${row.id}`, row) })
   ```

3. **Do NOT apply the unsafe (`!` / `safety none`) validation-skip cutout yet.**
   The binding-apply inner loop is `el[target] = get(path)` — there is almost no
   tjs validation in it to skip, and the throughput above shows it is not the
   bottleneck. Per principle 5 this stays off until a real workload profiles as
   validation-bound. The seam exists (mark the hot function `!`), so turning it
   on later is a localized change, not a redesign.

## What's still open (when a real app needs it)

- **DOM-write batching / microtask flush.** `batch()` coalesces *notifications*;
  it does not yet defer the DOM writes themselves to a single rAF/microtask. If a
  profile shows redundant layout/paint from many synchronous DOM writes, add an
  async flush behind `batch()` (or a global update queue) — keeping the
  un-batched path synchronous so existing semantics and tests hold.
