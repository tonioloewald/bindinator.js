function Test(fn) {
	if (this === window) {
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
	if (!targets instanceof Array) {
		targets = [].slice.apply(targets);	
	}
	targets.forEach(target => {
		target.dispatchEvent(new Event(event_type, {bubbles: true, view: window}));
	});
	return this;
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

Test.trigger = trigger;

Test.prototype = {
	shouldBe: function(value) {
		this.expected = value;
	},

	run: function() {
		var result = this.fn();
		if (result instanceof Promise) {
			result.then((final) => {
				if (final !== this.expected) {
					this.failure(this.fn.toString(), '==', result, 'expected', this.expected);
				} else {
					this.success(this.fn.toString(), '==', result);
				}
			}, () => {
				this.failed('Promise failed');
			});
		} else {
			setTimeout(() => {
				if (result !== this.expected) {
					this.failure(this.fn.toString(), '== "', result, '"" expected', this.expected);
				} else {
					this.success(this.fn.toString(), '== "', result, '"');
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
}