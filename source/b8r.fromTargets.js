/**
# fromTargets
Copyright ©2016-2017 Tonio Loewald

## collecting data from the DOM

The following binding *targets* will automatically copy data from the DOM to bound objects
when an input or change event fires on the bound element:

### value

The **value** of `<input>` and `<textarea>` elements

### checked

The **checked** of an `<input type="checkbox">` or `<input type="radio">` element.

### text

The **textContent** of a typical element (including div, span, and so forth). Note 
that these elements will only get change events if you send them.
*/
/* global module */
'use strict';

module.exports = function(b8r) {

return {
	value: function(element){
		return element.value;
	},
	checked: function(element) {
		return element.checked;
	},
	text: function(element){
		return element.textContent;
	},
	fromMethod: function(element, path) {
		var [model, ...method] = path.split('.');
		method = method.join('.');
		return b8r.getByPath(model, method)(element);
	},
	component: function(element, path) {
		const component = element.closest('[data-component-id]');
		const id = component.getAttribute('data-component-id');
		return b8r.getByPath(id, path);
	}
};

};