// Headless micro-benchmark for the observe/apply path. Run: bun bench/observe-bench.mjs
import { register, set, observe, batch } from '../src/observe.tjs'

const bench = (fn) => { const t = performance.now(); fn(); return performance.now() - t }
const rate = (n, ms) => Math.round(n / ms * 1000).toLocaleString()

// [1] raw synchronous set + notify throughput (the default, validated path)
register('a', { x: 0 })
let n1 = 0
const offA = observe('a.x', () => { n1++ })
const N = 500000
const dt1 = bench(() => { for (let i = 1; i <= N; i++) set('a.x', i) })
offA()
console.log(`[1] sync set+notify: ${N.toLocaleString()} sets in ${dt1.toFixed(1)}ms`)
console.log(`    = ${rate(N, dt1)} sets/sec, ${n1.toLocaleString()} notifications`)

// [2] coalescing: a burst of M sets with K overlapping observers
register('b', { root: { v: 0 } })
const K = 100
const M = 1000
let fires = 0
const offs = []
for (let k = 0; k < K; k++) offs.push(observe('b.root', () => { fires++ }))
fires = 0
const dtNo = bench(() => { for (let i = 1; i <= M; i++) set('b.root.v', i) })
const firesNo = fires
fires = 0
const dtYes = bench(() => { batch(() => { for (let i = 1; i <= M; i++) set('b.root.v', i) }) })
const firesYes = fires
for (const off of offs) off()
console.log(`[2] burst of ${M.toLocaleString()} sets x ${K} overlapping observers:`)
console.log(`    no batch: ${firesNo.toLocaleString()} callback fires in ${dtNo.toFixed(1)}ms`)
console.log(`    batch:    ${firesYes.toLocaleString()} callback fires in ${dtYes.toFixed(1)}ms`)
console.log(`    -> ${Math.round(firesNo / firesYes)}x fewer callbacks, ${(dtNo / dtYes).toFixed(1)}x faster`)
