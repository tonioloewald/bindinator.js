// bindinator.js Copyright (c) 2016 Tonio Loewald
/* globals console */

(function(module){
'use strict';

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

function trigger (event_type, target) {
	var targets;
	if (typeof target === 'string') {
		targets = document.querySelectorAll(target);
	} else if (!target.length) {
		targets = [target];
	}
	if (!(targets instanceof Array)) {
		targets = [].slice.apply(targets);	
	}
	targets.forEach(target => {
		target.dispatchEvent(new Event(event_type, {bubbles: true, view: window}));
	});
}

function report (message, _class_) {
	var report = document.querySelector('.report');
	if (report) {
		var p = document.createElement('p');
		if (_class_) {
			p.classList.add(_class_);
		}
		p.textContent = message;
		report.appendChild(p);
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

Test.prototype = {
	shouldBe: function(value) {
		this.expected = value;
	},

	shouldNotBe: function(value) {
		this.unexpected = value;
	},

	run: function() {
		var result = this.fn();
		if (result instanceof Promise) {
			result.then((final) => {
				if (final !== this.expected) {
					this.failure(this.fn.toString(), '==', quote(result), 'expected', this.expected);
				} else {
					this.success(this.fn.toString(), '==', quote(result));
				}
			}, () => {
				this.failure('Promise failed');
			});
		} else {
			setTimeout(() => {
				if (result !== this.expected) {
					this.failure(this.fn.toString(), '==', quote(result), 'expected', this.expected);
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
		report([].slice.apply(arguments).join(' '), 'failure');
	}
};

module.exports = Test;
}(module));