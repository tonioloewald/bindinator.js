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

~~~~
const {debounce, delay, throttle, throttleAndDebounce} = await import('../source/b8r.functions.js')

Test(async () => {
  const start = Date.now()
  await delay(100)
  return Date.now() - start
}, 'delay works').shouldBe(100, 20)

Test(async () => {
  const outcomes = []
  const boing = debounce((x) => { outcomes.push(x) }, 100)
  let failed = false

  boing(1)
  boing(2)
  boing(3)
  failed = failed || outcomes.length > 0
  await delay(130)
  failed = failed || outcomes[0] !== 3
  boing(4)
  boing(5)
  failed = failed || outcomes.length > 1
  await delay(130)
  failed = failed || outcomes[1] !== 5
  await delay(130)
  await delay(200)
  failed = failed || outcomes.length > 2
  return failed
}, 'debounce works').shouldBe(false)

Test(async () => {
  const outcomes = []
  const buzz = throttle((x) => {
    outcomes.push(x)
  }, 100)
  let failed = false
  buzz(1)
  buzz(2)
  buzz(3)
  failed = failed || (outcomes[0] !== 1 || outcomes.length !== 1)
  await delay(130)
  failed = failed || (outcomes.length !== 1)
  buzz(4)
  buzz(5)
  failed = failed || (outcomes[1] !== 4 || outcomes.length !== 2)
  await delay(130)
  failed = failed || (outcomes.length > 2)
  return failed
}, 'throttle works').shouldBeJSON(false)

Test(async () => {
  const outcomes = []
  const buzz = throttleAndDebounce((x) => {
    outcomes.push(x)
  }, 100)
  let failed = false
  buzz(1)
  buzz(2)
  buzz(3)
  failed = failed || (outcomes[0] !== 1 || outcomes.length !== 1)
  await delay(130)
  failed = failed || (outcomes[1] !== 3 || outcomes.length !== 2)
  buzz(4)
  failed = failed || (outcomes[2] !== 4 || outcomes.length !== 3)
  buzz(5)
  buzz(6)
  await delay(200)
  failed = failed || (outcomes[3] !== 6 || outcomes.length !== 4)
  await delay(200)
  failed = failed || (outcomes.length !== 4)
  return failed
}, 'throttleAndDebounce works').shouldBeJSON(false)
~~~~
*/

const delay = (delayMs) => new Promise((resolve, reject) => {
  setTimeout(resolve, delayMs)
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
    debounceId = setTimeout(() => origFn(...args), minInterval)
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
