/**
# Test
Copyright ©2016-2017 Tonio Loewald

A very simple test library with support for async tests.

To test something:

    Test(() => ... [, 'description']).shouldBe(expectedValue);

For example:

    Test(() => 1 + 1, 'math still works').shouldBe(2);

By default, the `description` will be the text of the test method.

## Async Tests

Just return a promise:

    Test(() => new Promise(resolve => resolve(3))).shouldBe(3);

Or sometimes:

    Test(() => ... [, 'description']).shouldNotBe(wrongValue);

To setup visible reporting:

    Test.setReportContainer(element);

To set an error callback:

    Test.onError = () => ...;

To get a list of tests (which will include descriptions and statuses):

    Test.tests();

To reset the list of tests:

    Test.reset();

~~~~
Test(() => 3).shouldBe(3);
Test(() => new Promise(resolve => resolve(3))).shouldBe(3);
Test(() => new Promise(resolve => {
  setTimeout(() => resolve(3), 1000);
})).shouldBe(3)
Test(() => 17).shouldNotBe(3);
Test(() => {throw 'ouch'}).shouldThrow();
Test(() => new Promise((resolve) => {throw 'ouch'})).shouldThrow();
Test(() => 17).shouldBe(17);
Test(() => { return {foo: 17} }).shouldBeJSON({foo:17});
~~~~
*/
/* jshint latedef:false */
/* globals console, Event */

'use strict'
var reportContainer
const tests = []

const makeReportItem = description => {
  if (reportContainer) {
    const p = document.createElement('p')
    p.classList.add('pending')
    p.textContent = description
    reportContainer.appendChild(p)
    return p
  }
}

function quote (x) {
  const json = JSON.stringify(x)
  if (typeof x === 'string') {
    return '"' + x + '"'
  } else if (typeof x === 'number') {
    return x
  } else if (x instanceof Array) {
    return json.length < 50 ? json : '[...]'
  } else if (typeof x === 'object') {
    return json.length < 50 ? json : '{...}'
  } else {
    return x
  }
}

class _Test {
  constructor (fn, description) {
    if (typeof fn === 'function') {
      this.fn = fn
      const source = fn.toString().replace(/^\(\)\s*=>\s*/, '')
      this.description = description ? `${description} — ${source}` : source
      this.status = 'incomplete'
      this.reportContainer = makeReportItem(this.description)
      this.threwError = false
      this.onError = Test.onError
      tests.push(this)
      this.run()
    } else {
      throw new Error(`Test expects a function, got ${fn}`)
    }
  }

  shouldBe (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this._expected = `expected ${value}`
    this._test = x => x === value
  }

  shouldBeJSON (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this._expected = `expected ${JSON.stringify(value)}`
    this._test = x => JSON.stringify(x) === JSON.stringify(value)
  }

  shouldThrow () {
    this._expected = `expected throw`
    this._test = () => this.threwError
  }

  shouldNotBe (value) {
    if (this._test) {
      throw new Error('cannot set a different expectation')
    }
    this._expected = `did not expect ${value}`
    this._test = x => x !== value
  }

  grade (result) {
    if (!this._test(result)) {
      this.failure(result)
    } else {
      this.success(result)
    }
  }

  report (message, _class_) {
    Test.report(message, _class_, this.reportContainer)
  }

  success (result) {
    this.status = 'success'
    this.report(`${this.description} == ${quote(result)}`, 'success')
  }

  failure (result) {
    this.onError()
    this.status = 'failure'
    this.report(`${this.description} == ${quote(result)}`, 'failure')
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

export function Test (fn, description, _reportContainer) {
  if (_reportContainer) reportContainer = _reportContainer
  return new _Test(fn, description)
}

Test.onError = () => {}

Test.tests = () => tests

Test.reset = () => tests.splice(0)

Test.setReportContainer = elt => {
  reportContainer = elt
}

function trigger (eventType, target) {
  var targets
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

Test.trigger = trigger

function report (message, _class_, target) {
  target = target || reportContainer
  if (target) {
    target.classList.remove('pending')
    target.classList.add(_class_)
    target.textContent = message
  } else {
    console.error(message)
  }
}

Test.report = report

export default Test
