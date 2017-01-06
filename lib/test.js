// bindinator.js Copyright ©2016-2017 Tonio Loewald
/* globals module, console */

(function(module){
'use strict';

var report_container;

function Test(fn) {
	if (!this || this === window) {
		return new Test(fn);
	} else if (typeof fn === 'function') {
		this.fn = fn;
		this.run();
	} else {
		console.error('Test expects a function, got', fn.toString());
	}
}

Test.onError = () => {};

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

Test.prototype = {
	shouldBe: function(value) {
		this._expected = `expected ${value}`;
		this._test = x => x === value;
	},

	shouldNotBe: function(value) {
		this._expected = `did not expect ${value}`;
		this._test = x => x !== value;
	},

	run: function() {
		var result = this.fn();
		if (result instanceof Promise) {
			result.then(() => {
				if (!this._test(result)) {
					this.failure(this.fn.toString(), '==', quote(result), this._expected);
				} else {
					this.success(this.fn.toString(), '==', quote(result));
				}
			}, () => {
				this.failure('Promise failed');
			});
		} else {
			setTimeout(() => {
				if (!this._test(result)) {
					this.failure(this.fn.toString(), '==', quote(result), this._expected);
				} else {
					this.success(this.fn.toString(), '==', quote(result));
				}
			});
		}
	},

	success: function() {
		report([].slice.apply(arguments).join(' '), 'success');
	},

	failure: function() {
		Test.onError();
		report([].slice.apply(arguments).join(' '), 'failure');
	}
};

module.exports = Test;
}(module));