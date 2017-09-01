// bindinator.js Copyright ©2016-2017 Tonio Loewald
/**
	Shortcuts allows shortcut or accelerator keytrokes to be assigned to any control

	e.g.

	```
		<button data-event="shortcut,click:do.something" data-shortcut="alt-y">Yoink</button>
	```

	The shortcut will trigger a synthetic 'shortcut' event on the target (after focusing it,
	and then shortly afterward blurring it.)
*/
/* global require, module */
'use strict';

const b8r = require('../source/b8r.js');
b8r.on(document.body, 'keydown', 'shortcuts', 'key');

var shortcut_targets = b8r.find('[data-shortcut]');

b8r.register('shortcuts', {
	key(evt) {
		const keystroke = b8r.keystroke(evt);
		const matches = shortcut_targets.filter(elt => elt.getAttribute('data-shortcut') === keystroke);

		if (matches.length > 0) {
			b8r.trigger('focus', matches[0]);
			b8r.trigger('shortcut', matches[0]);
			setTimeout(() => {
				b8r.trigger('blur', matches[0]);
			}, 250);
			if (matches.length > 1) {
				console.warn('shortcut has more than one match', keystroke, matches); // jshint ignore:line
			}
		} else {
			return true;
		}
	}
});

const specialKeys = {
	BracketLeft: '[',
	BracketRight: ']',
};

const add_shortcut_title = elt => {
	var caption = elt.getAttribute('data-shortcut').split('-');
	caption.forEach((s, i) => {
		caption[i] = b8r.modifierKeys[s] || specialKeys[s] || s;
	});
	caption = caption.join('');
	elt.setAttribute('title', caption);
};

const update = () => {
	shortcut_targets = b8r.find('[data-shortcut]');
	shortcut_targets
		.filter(elt => !elt.hasAttribute('title'))
		.forEach(add_shortcut_title);
};

module.exports = {update};

