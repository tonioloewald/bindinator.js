/**
# Test
Copyright ©2016-2022 Tonio Loewald

A very simple test library with support for async tests.

To test something, use configuredTest to produce a factory function
for generating configured tests:

    import {configuredTest} from 'path/to/test.js'

    const Test = configuredTest({
      // anything special want done when an error occurs
      onError: (e) => console.error(e),
      // where you want the result put in the DOM
      reportContainer: document.querySelector('.errors'),
    })
    Test(() => … [, 'description']).shouldBe(expectedValue);

For example:

    Test(() => 1 + 1, 'math still works').shouldBe(2);

For calculations involving real numbers, you can pass shouldBe a
second `epsilon` parameter, e.g.

    Test(() => Math.PI).shouldBe(3.14, 0.01)

By default, the `description` will be the text of the test method.

To perform deep comparisons of objects, use `shouldBeJSON`:

    Test(() => complex_object1).shouldBeJSON(complex_object2);

## Async Tests

Just return a promise:

    Test(() => new Promise(resolve => resolve(3))).shouldBe(3);

Or sometimes:

    Test(() => … [, 'description']).shouldNotBe(wrongValue);

To get a list of test instances (which will include descriptions and statuses):

    Test.tests();

To reset the list of tests within a given configured test:

    Test.reset();

To generate delays, use `waitMs(delayMs=100, value)`:

    import {waitMs} from 'path/to/test.js'
    const outcome = await waitMs(5000, 17);
    // 5s later, outcome will be 17

To conveniently generate async failures, use `throwAfterMs(errorToThrow=new Error('something bad happend', delayMs=100)`

    import {throwAfterMs} from 'path/to/test.js'
    Test(() => {
      thingThatUsesAsyncStuff(throwAfterMs())
    }).shouldBeJSON(expectedErrorOutcome)

To trigger events, a {trigger} method is also exported:

    import {trigger} from 'path/to/test.js'
    trigger('change', document.querySelector('#change-target'))

## Screenshot Tests (WIP)

**Note**: these tests will only work on `localhost` when using the dev server (`server.js`)

`b8r`'s devserver supports screen capture via [puppeteer](https://www.npmjs.com/package/puppeteer)

Here's an example (the service is at `./screencap/url/to/capture`). The dev site `index.html` will
set darkmode if the url includes the query parameter darkmode=true|false. (See `components/darkmode.js`.)

#### Screen Cap — Dark Mode
![puppetteer screenshot](/screencap/?body=components/kitchen-sink&darkmode=true)

#### Screen Cap — Light Mode
![puppetteer screenshot](/screencap/?body=components/kitchen-sink&darkmode=false)

~~~~
const {throwAfterMs, waitMs} = await import('../lib/test.js')

Test(() => waitMs(10000, 17)).shouldBe(17);
Test(() => 3).shouldBe(3);
Test(() => Math.PI).shouldBe(3.14, 0.01)
Test(() => new Promise(resolve => resolve(3))).shouldBe(3);
Test(() => new Promise(resolve => {
  setTimeout(() => resolve(3), 1000);
})).shouldBe(3)
Test(() => 17).shouldNotBe(3);
Test(() => {throw 'ouch'}).shouldThrow();
Test(() => new Promise((resolve) => {throw 'ouch'})).shouldThrow();
Test(17).shouldBe(17)
Test(Promise.resolve(17)).shouldBe(17)
Test(() => Promise.resolve(17)).shouldBe(17)
Test(async () => 17).shouldBe(17)
Test(() => 17).shouldBe(17);
Test(() => { return {foo: 17} }).shouldBeJSON({foo:17});
Test(() => throwAfterMs()).shouldThrow();
Test(() => (()=>{})).shouldShareConstructor(() => {})
Test(() => (async ()=>{})).shouldBeInstanceOf((async () => {}).constructor)
~~~~
*/
/* jshint latedef:false */
/* globals console, Event */

function quote (x) {
  if (typeof x === 'string') {
    return '"' + x + '"'
  } else if (typeof x === 'number') {
    return x
  } else if (typeof x === 'object') {
    return JSON.stringify(x)
  } else {
    return x
  }
}

export class Test {
  constructor (fn, description, tests, reportContainer, onError = () => {}) {
    let source
    if (typeof fn !== 'function') {
      source = `${fn}`
      this.fn = () => fn
    } else {
      source = fn.toString().replace(/^\(\)\s*=>\s*/, '')
      this.fn = fn
    }
    this.description = description ? `${description} — ${source}` : source
    this.status = 'incomplete'
    if (reportContainer) {
      this.reportItem = document.createElement('pre')
      this.reportItem.classList.add('pending')
      this.reportItem.textContent = this.description
      reportContainer.appendChild(this.reportItem)
    }
    this.testedRelationship = '=='
    this._expected = false
    this.onError = onError
    this.threwError = false
    tests.push(this)
    this.run()
    this.drained = new Promise((resolve, reject) => {
      this.callOnCompletion = resolve
      this.wtf = reject
    })
  }

  shouldBe (value, epsilon = false) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this._expected = epsilon > 0 ? `${value} ±${epsilon} ` : `${value}`
    this.testedRelationship = epsilon > 0 ? `±${epsilon} ==` : '=='
    this._test = x => epsilon > 0 ? x - epsilon < value && x + epsilon > value : x === value
    return this.drained
  }

  shouldBeInstanceOf (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this.testedRelationship = 'instanceOf'
    this._test = x => x.constructor === value
    return this.drained
  }

  shouldShareConstructor (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this.testedRelationship = 'shares constructor of'
    this._test = x => x.constructor === value.constructor
    return this.drained
  }

  shouldBeJSON (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this.testedRelationship = '(as json) =='
    this._expected = `${JSON.stringify(value)}`
    this._test = x => JSON.stringify(x) === JSON.stringify(value)
    return this.drained
  }

  shouldThrow () {
    this._expected = 'throw'
    this.testedRelationship = '=>'
    this._test = () => this.threwError
    return this.drained
  }

  shouldNotBe (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this.testedRelationship = '!='
    this._expected = `NOT ${value}`
    this._test = x => x !== value
    return this.drained
  }

  grade (result) {
    if (!this._test(result)) {
      this.failure(result)
    } else {
      this.success(result)
    }
  }

  report (message, _class_) {
    const { reportItem } = this
    if (reportItem) {
      reportItem.classList.remove('pending')
      reportItem.classList.add(_class_)
      reportItem.textContent = message
    } else {
      console.error(message)
    }
  }

  success (result) {
    this.status = 'success'
    this.report(`${this.description} ${this.testedRelationship} ${quote(result)}`, 'success')
    this.callOnCompletion()
  }

  failure (result) {
    this.onError()
    this.status = 'failure'
    const expectation = this._expected ? '; expected ' + this._expected : ''
    const description = `${this.description} ${this.testedRelationship} ${quote(result)}, ${expectation}`
    this.report(description, 'failure')
    this.callOnCompletion(Error(description))
  }

  run () {
    let result
    try {
      result = this.fn()
    } catch (e) {
      result = `threw ${e}`
      this.threwError = true
    }
    if (result instanceof Promise) {
      result
        .then(result => this.grade(result))
        .catch((e) => {
          this.threwError = true
          this.grade(`threw ${e}`)
        })
    } else {
      setTimeout(() => this.grade(result))
    }
  }
}

export function configuredTest (settings) {
  const tests = []
  return (fn, description) => {
    const t = new Test(fn, description, tests, settings.reportContainer, settings.onError)
    t.reset = () => tests.splice(0)
    return t
  }
}

export const waitMs = (durationMs = 1000, value) => new Promise(resolve => {
  setTimeout(() => resolve(value), durationMs)
})

export const throwAfterMs = async (errorToThrow = new Error('something bad happened'), delayMs = 100) => {
  await waitMs(delayMs)
  throw errorToThrow
}

export function trigger (eventType, target) {
  let targets
  if (typeof target === 'string') {
    targets = document.querySelectorAll(target)
  } else if (!target.length) {
    targets = [target]
  }
  if (targets.length && !(targets instanceof Array)) {
    targets = [].slice.apply(targets)
  }
  targets.forEach(target => {
    target.dispatchEvent(
      new Event(eventType, { bubbles: true, view: window }))
  })
}
