/**
# fromTargets
Copyright ©2016-2017 Tonio Loewald

## collecting data from the DOM

The following binding *targets* will automatically copy data from the DOM to bound objects
when an input or change event fires on the bound element:

### value

The **value** of `<input>` and `<textarea>` elements; it will correctly return
the value of `<input type="radio" ...>` elements.

### checked

The **checked** of an `<input type="checkbox">` or `<input type="radio">` element.

### selected

The **selected** attribute on an `<option>`.

### text

The **textContent** of a typical element (including div, span, and so forth). Note
that these elements will only get change events if you send them.
*/
/* global module */
'use strict';

module.exports = function(b8r) {

return {
	value: function(element){
		if(element.matches('input[type=radio]')){
			const name = element.getAttribute('name');
			const checked = b8r.find(`input[type=radio][name=${name}]`).find(elt => elt.checked);
			return checked ? checked.value : null;
		} else {
			return element.value;
		}
	},
	checked: element => element.checked,
	selected: element => element.selected,
	text: function(element){
		return element.textContent;
	},
	fromMethod: function(element, path) {
		var [model, ...method] = path.split('.');
		method = method.join('.');
		return b8r.getByPath(model, method)(element);
	},
};

};
