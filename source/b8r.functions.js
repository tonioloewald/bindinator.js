/**
# functions

This module provides convenient access to the `AsyncFunction` constructor.

    const f = new b8r.AsyncFunction(...args, code)

> ### A note for test failures
>
> Many of the tests in this library are highly sensitive to background processing
> (since they're async tests based on delays in a non-pre-emptive context). So, if
> a test fails, check if it calls `delay()`, and maybe run it a few more times.

Utility functions for preventing a method from being called too frequently.

### debounce(func, delayMs)

The idea of a debounced function is that it won't get called until you stop calling it
for a certain amount of time. And *the last call always goes through*. So if you're
trying to respond to user input with an expensive operation, but it's important that
the last thing the user does is accounted for, use debounce.

    b8r.debounce(method, delayMs) => debounced function

From a function `f`, create a function that will call f after the provided interval has passed,
the interval being reset if the function is called again.

E.g. you want to call a query "as the user types" but don't want to call until the user pauses
typing for a while or at least has a chance to type a few keys. This is also a case where
responding immediately is actually a bad thing (e.g. when a user starts typing in a search
field, they typically don't want to search for the first character they type, so waiting a
fraction of a second after the user types something before calling a query makes the
user interface *more* responsive *and* saves bandwidth.)

> A debounced function won't fire until it stops being called for a while.
> The last call to a debounced function always goes through.

### throttle(func, delayMs)

The idea of a throttled function is that you want to respond to something immediately, but
if it happens repeatedly, you don't want to thrash it, and it's not critically important
to process the final situation, so if several calls are made in quick succession, all but
the first are skipped.

    b8r.throttle(method, intervalMs) => throttled function

From a function `f`, create a function that will call f if and only if the function hasn't
been called in the last interval.

> If you call a throttled function several times in quick succession, all but the
> first call will be skipped. If you're working with data, throttled functions are
> almost always a bad idea since you may skip the last thing that happened. So,
> use throttleAndDebounce (below).

### throttleAndDebounce(func, intervalMs)

The best of both worlds is often to throttle AND debounce a function. This way it responds
to the first call immediately, but also to the final call. A good case for using
this is to handle cosmetic user-interface actions (e.g. scrolling) where it's important
to react quickly, and it's important to finish in the right place, but handling every
single intermediate call is really not relevant.

    b8r.throttleAndDebounce(method, minInterval_ms) => throttled and debounced function

This combines the two concepts. If called repeatedly, it will not fire more often than once
per interval, and will fire after the interval has passed since the last call.

E.g. if you want to respond 'live' to a user dragging something around or resizing an object,
but you don't want to do it 60 times per second, `throttleAndDebounce` will ensure that it
updates throughout the operation and fires one last time after the operation stops.

    await b8r.delay(milliseconds, value=null)

`delay` is a simple utility function that resolves after the specified amount of time to
the value specified (null by default).

~~~~
// title: throttle, debounce, and throttleAndDebounce tests
const {debounce, delay, throttle, throttleAndDebounce} = await import('../source/b8r.functions.js')

await delay(1000)

const start = Date.now()
const outerA = []
const outerB = []
const outerC = []
const throttled = b8r.throttle(a => { outerA.push(a) }, 1000)
const debounced = b8r.debounce(b => { outerB.push(b) }, 1000)
const bothed = b8r.throttleAndDebounce(c => { outerC.push(c) }, 1000)

throttled(1)
throttled(2)
throttled(3)
debounced(1)
debounced(2)
debounced(3)
bothed(1)
bothed(2)
bothed(3)

await delay(500)

// throttled(1) fired immediately
// throttled(2) and throttled(3) were skipped
// debounced(1) and debounced(2)
// debounced(3) will fire at 100
// bothed(1) fired immediately
// bothed(2) was skipped
// bothed(3) will fire at 1000

await Test(outerA, 'throttled calls').shouldBeJSON([1])
await Test(outerB, 'debounced calls').shouldBeJSON([])
await Test(outerC, 'throttled and debounced calls').shouldBeJSON([1])

await delay(1000) // 1500ms elapsed

// throttled(3) fired at 1000
// debounced(3) fired at 1000
// bothed(3) fired at 1000

await Test(outerA, 'throttled calls').shouldBeJSON([1])
await Test(outerB, 'debounced calls').shouldBeJSON([3])
await Test(outerC, 'throttled and debounced calls').shouldBeJSON([1,3])

debounced(4)
bothed(4)
throttled(4)
debounced(5)
bothed(5)
throttled(5)
debounced(6)
bothed(6)
throttled(6)

await delay(1000) // 2500ms elapsed

// throttled(4) fired at 1500
// throttled(5) was skipped
// debounced(4) and debounced(5) were skipped
// debounced(6) fired at 2000
// bothed(4) and bothan(5) were skipped
// both(6) fired at 2000

Test(outerA, 'throttled calls').shouldBeJSON([1,4])
Test(outerB, 'debounced calls').shouldBeJSON([3,6])
Test(outerC, 'throttled and debounced calls').shouldBeJSON([1,3,4,6])
~~~~
*/

/**
### Seeing it all in action

Here's a snippet of code to run in console to see exactly what's going on
with these meta-functions:

    (async function () {
      const start = Date.now()
      const f = b8r.throttleAndDebounce((arg) => console.log('both', arg, arg - (Date.now() - start)), 500) 
      const g = b8r.debounce((arg) => console.log('debounce', arg, arg - (Date.now() - start)), 500) 
      const h = b8r.throttle((arg) => console.log('throttle', arg, arg - (Date.now() - start)), 500) 
      for(let i = 0; i < 20; i++) {
        await b8r.delay(Math.random() * 500)
        const elapsed = Date.now() - start
        console.log(elapsed)
        f(elapsed)
        g(elapsed)
        h(elapsed)
      }
      console.log('exited', Date.now() - start)
    })()

In essence, if you run this, debounce will only fire once, at the end. The other two will fire 
immediately and at regular intervals, but only throttleAndDebounce and debounce will fire
the last calls.

### async delay(ms)

    await delay(1000) // wait 1s

A simple utility function (mostly for testing).
*/

const delay = (delayMs, value = null) => new Promise((resolve, reject) => {
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
        previousCall = Date.now()
      } finally {
        inFlight = false
      }
    }
  }
}

const AsyncFunction = async function () {}.constructor

const memoize = f => {
  if (f._isMemoized) return f
  let previousArgs = []
  let previousResult
  const memoized = function (...args) {
    const newArgs = [this, ...args]
    const differences = previousResult === undefined || newArgs.filter((item, index) => item !== previousArgs[index]).length
    if (differences) {
      previousArgs = newArgs
      previousResult = f.call(this, ...args)
    }
    return previousResult
  }
  memoized._isMemoized = true
  return memoized
}

/**
## Memoize

`memoize` is a function that turns any function into a function that short circuits sequences of
identical calls
~~~~
// title: memoize tests
const {memoize} = await import('../source/b8r.functions.js')
let callCount = 0
const results = []

const box = {
  add(a, b) {
    callCount += 1
    return a + b;
  }
}
box.add = memoize(box.add)
const {add} = box;

Test(() => memoize(box.add) === box.add, 'memoizing a memoized function is a no-op').shouldBe(true)

results.push(add(1,2))
results.push(add(1,2))
Test(callCount, 'memoize shortcuts duplicate invocations').shouldBe(1)
results.push(add(2,2))
Test(callCount, 'memoize shortcuts duplicate invocations').shouldBe(2)
results.push(box.add(2,2))
results.push(box.add(2,2))
Test(callCount, 'this changing triggers recalc').shouldBe(3)
results.push(add(2,2))
Test(callCount, 'this changing to undefined triggers recalc').shouldBe(4)
results.push(box.add(2,3))
Test(callCount, 'changes trigger recalc').shouldBe(5)
results.push(box.add(3,2))
Test(callCount, 'same parameters in different order still trigger recalc').shouldBe(6)

Test(17).shouldBe(17)
Test(results, 'memoize does not corrupt output').shouldBeJSON([3, 3, 4, 4, 4, 4, 5, 5])
~~~~
*/

export { AsyncFunction, debounce, delay, throttle, throttleAndDebounce, memoize }
