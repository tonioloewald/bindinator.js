/**
# Test
Copyright ©2016-2017 Tonio Loewald

A very simple test library with support for async tests.

To test something:

    Test(() => ... [, 'description']).shouldBe(expected_value);

For example:

    Test(() => 1 + 1, 'math still works').shouldBe(2);


## Async Tests

Just return a promise:

    Test(() => new Promise((resolve) => resolve(3))).shouldBe(3);

Or sometimes:

    Test(() => ... [, 'description']).shouldNotBe(wrong_value);

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
Test(() => new Promise((resolve) => resolve(3))).shouldBe(3);
Test(() => 17).shouldNotBe(3);
Test(() => {throw 'ouch'}).shouldThrow();
Test(() => new Promise((resolve) => {throw 'ouch'})).shouldThrow();
Test(() => 17).shouldBe(3);
~~~~
*/
/* jshint latedef:false */
/* globals module, console */

'use strict';
var report_container;
const tests = [];

function quote(x) {
  const json = JSON.stringify(x);
  if (typeof x === 'string') {
    return '"' + x + '"';
  } else if (typeof x === 'number') {
    return x;
  } else if (x instanceof Array) {
    return json.length < 50 ? json : '[...]';
  } else if (typeof x === 'object') {
    return json.length < 50 ? json : '{...}';
  } else {
    return x;
  }
}

class _Test {
  constructor (fn, description) {
    if (typeof fn === 'function') {
      this.fn = fn;
      const source = fn.toString().replace(/^\(\)\s*=>\s*/, '');
      this.description = description ? `${description} — ${source}` : source;
      this.status = 'incomplete';
      this.report_container = report_container;
      this.threw_error = false;
      this.onError = Test.onError;
      tests.push(this);
      this.run();
    } else {
      throw `Test expects a function, got ${fn}`;
    }
  }

  shouldBe(value) {
    if (this._test) {
      throw 'cannot set a different expectation';
    }
    this._expected = `expected ${value}`;
    this._test = x => x === value;
  }

  shouldBeJSON(value) {
    if (this._test) {
      throw 'cannot set a different expectation';
    }
    this._expected = `expected ${JSON.stringify(value)}`;
    this._test = x => JSON.stringify(x) === JSON.stringify(value);
  }

  shouldThrow() {
    this._expected = `expected throw`;
    this._test = () => this.threw_error;
  }

  shouldNotBe(value) {
    if (this._test) {
      throw 'cannot set a different expectation';
    }
    this._expected = `did not expect ${value}`;
    this._test = x => x !== value;
  }

  grade(result) {
    if (!this._test(result)) {
      this.failure(result);
    } else {
      this.success(result);
    }
  }

  report(message, _class_) {
    Test.report(message, _class_, this.report_container);
  }

  success(result) {
    this.status = 'success';
    this.report(`${this.description} == ${quote(result)}`, 'success');
  }

  failure(result) {
    this.onError();
    this.status = 'failure';
    this.report(`${this.description} == ${quote(result)}`, 'failure');
  }

  run() {
    let result;
    try {
      result = this.fn();
    } catch (e) {
      this.threw_error = true;
    }
    if (result instanceof Promise) {
      result.
      then(result => this.grade(result)).
      catch(() => {
        this.threw_error = true;
        this.grade();
      });
    } else {
      setTimeout(() => this.grade(result));
    }
  }
}

function Test(fn, description) {
  return new _Test(fn, description);
}

Test.onError = () => {};

Test.tests = () => tests;

Test.reset = () => tests.splice(0);

Test.setReportContainer = elt => report_container = elt;

function trigger(event_type, target) {
  var targets;
  if (typeof target === 'string') {
    targets = document.querySelectorAll(target);
  } else if (!target.length) {
    targets = [target];
  }
  if (targets.length && !(targets instanceof Array)) {
    targets = [].slice.apply(targets);
  }
  targets.forEach(target => {
    target.dispatchEvent(
        new Event(event_type, {bubbles: true, view: window}));
  });
}

Test.trigger = trigger;

function report(message, _class_, target) {
  target = target || report_container;
  if (target) {
    var p = document.createElement('p');
    if (_class_) {
      p.classList.add(_class_);
    }
    p.textContent = message;
    target.appendChild(p);
  } else {
    console.error(message);
  }
}

Test.report = report;

module.exports = Test;
