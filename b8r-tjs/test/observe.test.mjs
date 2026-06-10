// Tests for path-observed state. Run against built dist/ (npm test builds first).
// These pin the philosophy: stable by default, bindings are wiring.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { register, get, set, observe, touch } from '../dist/observe.js'

register('app', { count: 0, prefs: { darkmode: false } })

test('get reads nested values, undefined for gaps', () => {
  assert.equal(get('app.count'), 0)
  assert.equal(get('app.prefs.darkmode'), false)
  assert.equal(get('app.nope.nested'), undefined)
})

test('set updates the value and returns it', () => {
  assert.equal(set('app.count', 3), 3)
  assert.equal(get('app.count'), 3)
})

test('set notifies an observer exactly once, with the changed path', () => {
  const calls = []
  const off = observe('app.count', (path) => calls.push(path))
  set('app.count', 4)
  off()
  assert.deepEqual(calls, ['app.count'])
})

test('stable by default: setting the same value notifies no one', () => {
  let fired = 0
  const off = observe('app.count', () => { fired++ })
  set('app.count', get('app.count')) // same value
  off()
  assert.equal(fired, 0)
})

test('touch forces a notification even with no change (mutate-in-place case)', () => {
  let fired = 0
  const off = observe('app.prefs', () => { fired++ })
  get('app.prefs').darkmode = true // mutated in place — no notification yet
  assert.equal(fired, 0)
  touch('app.prefs') // now wire fires
  off()
  assert.equal(fired, 1)
})

test('observers fire for overlapping paths (ancestor and descendant)', () => {
  const hits = []
  const offParent = observe('app.prefs', () => hits.push('parent'))
  const offChild = observe('app.prefs.darkmode', () => hits.push('child'))
  set('app.prefs.darkmode', false) // change is at the child path
  offParent()
  offChild()
  assert.deepEqual(hits.sort(), ['child', 'parent'])
})

test('unobserve stops notifications', () => {
  let fired = 0
  const off = observe('app.count', () => { fired++ })
  off()
  set('app.count', 99)
  assert.equal(fired, 0)
})
