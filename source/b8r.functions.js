/**
# functions

This module provides convenient access to the `AsyncFunction` constructor.

    const f = new b8r.AsyncFunction(...args, code)

Utility functions for preventing a method from being called too frequently.
Not recommended for use on methods which take arguments!

    b8r.debounce(method, minInterval_ms) => debounced function

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys.

> A debounced method will call the original function at least once after the debounced version is
called.

    b8r.throttle(method, minInterval_ms) => throttled function

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

> If you call f several times within the specified interval, *only the first call will fire*.

    b8r.throttleAndDebounce(method, minInterval_ms) => throttled and debounced function

This combines the two concepts. If called repeatedly, it will not fire more often than once
per interval, and will fire after the interval has passed since the last call.

E.g. if you want to respond 'live' to a user dragging something around or resizing an object, 
but you don't want to do it 60 times per second, `throttleAndDebounce` will ensure that it 
updates throughout the operation and fires one last time after the operation stops.

    await b8r.delay(milliseconds, ...args)

`delay` is a simple utility function that resolves after the specified amount of time to
the args (if any) passed.

~~~~
const {debounce, delay, throttle, throttleAndDebounce} = await import('../source/b8r.functions.js')

Test(async () => {
  const failures = []
  const delayMs = Math.random() * 1000 + 1000
  let outcome
  outcome = await delay(delayMs, 'foo')
  if(outcome !== 'foo') failures.push('expected "foo" to be passed through')
  const start = Date.now()
  outcome = await delay(delayMs)
  if(Date.now() - start - delayMs > 50) failures.push(`delay should be roughly ${delayMs}ms, was ${Date.now() - start}ms`)
  return failures
}, 'delay works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const boing = debounce((x) => { outcomes.push(x) }, 100)
  const failures = []

  boing(1)
  boing(2)
  boing(3)
  if(outcomes.length > 0) failures.push('no boing should have fired yet')
  await delay(1000)
  if(outcomes[0] !== 3) failures.push('boing(3) should have fired first')
  boing(4)
  boing(5)
  if(outcomes.length > 1) failures.push('only one boing should have fired')
  await delay(130)
  if(outcomes[1] !== 5) failures.push('boing(5) should have fired second')
  await delay(130)
  await delay(200)
  if(outcomes.length > 2) failures.push('only two boings should ever fire')
  return failures
}, 'debounce works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const buzz = throttle((x) => {
    outcomes.push(x)
  }, 100)
  const failures = []

  buzz(1)
  buzz(2)
  buzz(3)
  if(outcomes[0] !== 1 || outcomes.length !== 1) failures.push('only buzz(1) should have fired')
  await delay(130)
  if(outcomes.length !== 1) failures.push('no more buzzes should have fired')
  buzz(4)
  buzz(5)
  if(outcomes[1] !== 4 || outcomes.length !== 2) failures.push('buzz(4) should have fired second')
  await delay(200)
  if(outcomes.length > 2) failures.push('only two buzzes should ever fire')
  return failures
}, 'throttle works').shouldBeJSON([])

Test(async () => {
  const outcomes = []
  const buzz = throttleAndDebounce((x) => {
    outcomes.push(x)
  }, 100)
  const failures = []
  buzz(1)
  buzz(2)
  buzz(3)
  if(outcomes[0] !== 1 || outcomes.length !== 1) failures.push('only buzz(1) should have fired')
  await delay(130)
  if(outcomes[1] !== 3 || outcomes.length !== 2) failures.push('buzz(3) should have fired via debounce')
  buzz(4)
  if(outcomes[2] !== 4 || outcomes.length !== 3) failures.push('buzz(4) should have fired immediately')
  buzz(5)
  buzz(6)
  await delay(200)
  if(outcomes[3] !== 6 || outcomes.length !== 4) failures.push('buzz(6) should have fired via debounce')
  await delay(200)
  if(outcomes.length > 4) failures.push('no more buzzes should have fired')
  return failures
}, 'throttleAndDebounce works').shouldBeJSON([])
~~~~
*/

const delay = (delayMs, value) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(value), delayMs)
})

const debounce = (origFn, minInterval) => {
  let debounceId
  return (...args) => {
    if (debounceId) clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      origFn(...args)
    }, minInterval)
  }
}

const throttle = (origFn, minInterval) => {
  let previousCall = Date.now() - minInterval
  let inFlight = false
  return (...args) => {
    const now = Date.now()
    if (!inFlight && now - previousCall >= minInterval) {
      inFlight = true
      try {
        origFn(...args)
      } finally {
        previousCall = now
        inFlight = false
      }
    }
  }
}

const throttleAndDebounce = (origFn, minInterval) => {
  let debounceId
  let previousCall = Date.now() - minInterval
  let inFlight = false
  return (...args) => {
    clearTimeout(debounceId)
    debounceId = setTimeout(async () => origFn(...args), minInterval)
    if (!inFlight && Date.now() - previousCall >= minInterval) {
      inFlight = true
      try {
        origFn(...args)
        inFlight = false
        previousCall = Date.now()
      } finally {}
    }
  }
}

const AsyncFunction = async function () {}.constructor

export { AsyncFunction, debounce, delay, throttle, throttleAndDebounce }
