/*
# Test
Copyright ©2016-2017 Tonio Loewald

A very simple test library with support for async tests.

To test something:

		Test(*function-expression-that-may-return-promise* [, *description*]).
		shouldBe(*exapectedValue*);

Or sometimes:

		Test(*function-expression-that-may-return-promise* [, *description*]).
		shouldNotBe(*exapectedValue*);

To setup visible reporting:

		Test.
		setReportContainer(*destination_element*);

To set an error callback:

		Test.onError = *function*;

To get a list of tests (which will include descriptions and statuses):

		Test.tests();

To reset the list of tests:

		Test.reset();
*/

/* globals module, console */

(function(module){
'use strict';

var report_container;
const tests = [];

function Test(fn, description) {
	if (!this || this === window) {
		return new Test(fn, description);
	} else if (typeof fn === 'function') {
		this.fn = fn;
		this.description = description || fn.toString();
		this.status = 'incomplete';
		tests.push(this);
		run(this);
	} else {
		console.error('Test expects a function, got', fn);
	}
}

Test.onError = () => {};

Test.tests = () => tests;

Test.reset = () => tests.splice(0);

Test.setReportContainer = (destination) => report_container = destination;

function trigger (event_type, target) {
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
		target.dispatchEvent(new Event(event_type, {bubbles: true, view: window}));
	});
}

function report (message, _class_) {
	if (report_container) {
		var p = document.createElement('p');
		if (_class_) {
			p.classList.add(_class_);
		}
		p.textContent = message;
		report_container.appendChild(p);
	} else {
		console.error(message);
	}
}

function quote (x) {
	if (typeof x === 'string') {
		return '"' + x + '"';
	} else if (typeof x === 'number') {
		return x;
	} else if (x instanceof Array) {
		return '[...]';
	} else if (typeof x === 'object') {
		return '{...}';
	} else {
		return x;
	}
}

Test.trigger = trigger;
Test.report = report;


function run(test) {
	var result = test.fn();
	if (result instanceof Promise) {
		result.then(() => {
			if (!test._test(result)) {
				failure(test, result);
			} else {
				success(test, result);
			}
		}, () => {
			test.failure('Promise failed');
		});
	} else {
		setTimeout(() => {
			if (!test._test(result)) {
				failure(test, result);
			} else {
				success(test, result);
			}
		});
	}
}

function success(test, result) {
	test.status = 'success';
	report(`${test.description} == ${quote(result)}`, 'success');
}

function failure(test, result) {
	Test.onError();
	test.status = 'failure';
	report(`${test.description} == ${quote(result)}`, 'success');
}

Test.prototype = {
	shouldBe: function(value) {
		if(this._test) {
			throw 'cannot set a different expectation';
		}
		this._expected = `expected ${value}`;
		this._test = x => x === value;
	},

	shouldNotBe: function(value) {
		if(this._test) {
			throw 'cannot set a different expectation';
		}
		this._expected = `did not expect ${value}`;
		this._test = x => x !== value;
	}
};

module.exports = Test;
}(module));