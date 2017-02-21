/**
# toTargets
Copyright ©2016-2017 Tonio Loewald

## Flushing data to the DOM

The following targets (attributes of a DOM element) can be bound to object data:

### value

	data-bind="value=message.text"

This is the value of `<input>` and `<textarea>` elements.

### checked

	data-bind="checked=message.private"

This is the checked proprity on `<input type="checked">` and `<input type="radio">` elements.

### text

	data-bind="text=message.sender.name"

This is the textContent property of most standard elements.

### attr()

	data-bind="attr(alt)=image.name"

This is the specified attribute. This can also be used to set "special" properties like id, class, and style.

### style()

	data-bind="style(color)=message.textColor"
	data-bind="style(padding-left,px)=message.leftPad"

This sets styles (via `element.style[stringValue]`) so be warned that hyphenated properties (in CSS) 
become camelcase in Javascript (e.g. background-color is backgroundColor).

The optional second parameter lets you specify units.

### class()

	data-bind="class(name)=message.truthyValue"

This lets you toggle a class based on a bound property.

### show_if, show_if(), hide_if, hide_if()

	data-bind="hide_if(_undefined_)=message.priority"

This shows (or hides) an element based on whether a bound value is truthy or matches 
the provided parameter.

### method()

	data-bind="method(model.notify)=message.priority"

Calls the specified method, passing it the bound value. The method will receive
the element, value, and data source as parameters. (This means that methods registered
as event handlers will need to deal with being passed a naked element instead of an event)

### component()

	data-bind="component=model.property"
	data-bind="component(path.to.property)=model.property"

This *sets* the component's private data, or the specified value in the 
component's private data, *by path*.

### component_map()

	data-bind="component-map(value:component_name;other:value:other_name|default_component)=message.type"

This allows a component to be bound dynamically based on a property.

### json

	data-bind="json=path.to.object"

Dumps a nicely formatted stringified object in an element (for debugging purposes);

## Comparison Values

These terms are used for comparison to certain values in conditional toTargets.

* `_true_`
* `_false_`
* `_undefined_`
* `_null_`
*/
/* jshint expr: true */
/* global require, module, console */
'use strict';

module.exports = function(b8r){

const img = require('./b8r.imgSrc.js');

const special_values = {
	'_true_': true,
	'_false_': false,
	'_undefined_': undefined,
	'_null_': null,
};

function equals(value_to_match, value) {
	if (typeof value === 'string') value = value.replace(/\&nbsp;/g, '').trim();
	if (special_values.hasOwnProperty(value_to_match)) {
		return value === special_values[value_to_match];
	} else if (value_to_match !== undefined) {
		return value == value_to_match; 
	} else {
		return !!value;
	}
}

return {
	value: function(element, value){
		switch (element.getAttribute('type')) {
			case 'radio': 
				element.checked = element.value === value;
				break;
			case 'checkbox':
				element.checked = value;
				break;
			default:
				element.value = value;
		}
	},
	checked: function(element, value) {
		element.checked = !!value;
	},
	text: function(element, value){
		element.textContent = value;
	},
	attr: function(element, value, dest) {
		if (value === undefined || value === null) {
			element.removeAttribute(dest);
		} else {
			element.setAttribute(dest, value);	
		}
	},
	img,
	bgImg: function(element, value) {
		if (value) {
			element.style.backgroundImage = `url("${value}")`;
		} else {
			element.style.backgroundImage = '';
		}
	},
	style: function(element, value, dest) {
		if (!dest) {
			if(typeof value === 'string') {
				element.setAttribute('style', dest);
			} else if (typeof value === 'object') {
				Object.assign(element.style, value);
			}
		} else if (value !== undefined) {
			const [prop, units] = (dest + ',').split(',');
			element.style[prop] = value + units;
		}
	},
	class: function(element, value, class_to_toggle) {
		if (class_to_toggle) {
			if (value) {
				element.classList.add(class_to_toggle);
			} else {
				element.classList.remove(class_to_toggle);
			}
		} else {
			element.setAttribute('class', value);
		}
	},
	enabled_if: function(element, value, dest) {
		element.disabled = !equals(dest, value);
	},
	disabled_if: function(element, value, dest) {
		element.disabled = equals(dest, value);
	},
	show_if: function(element, value, dest) {
		equals(dest, value) ? b8r.show(element) : b8r.hide(element);
	},
	hide_if: function(element, value, dest) {
		equals(dest, value) ? b8r.hide(element) : b8r.show(element);
	},
	method: function(element, value, dest, data) {
		var [model, ...method] = dest.split('.');
		method = method.join('.');
		b8r.callMethod(model, method, element, value, data);
	},
	json: function(element, value) {
		element.textContent = JSON.stringify(value, false, 2);
	},
	component: function(element, value, dest) {
		const id = element.getAttribute('data-component-id');
		if (id) {
			if(b8r.models().indexOf(id) > -1) {
				if (dest) {
					b8r.setByPath(id, dest, value);
				} else if (typeof value === 'object') {
					b8r.setByPath(id, value);
				}
			} else {
				console.error('component is not registered but is bound', element);
			}
		} else if (!element.getAttribute('data-component')) {	
			console.error('component toTarget found on non component', element);
		}
	},
	component_map: function(element, value, dest, data) {
		var component_options = dest.split('|');
		var component_name;
		for (var i = 0; i < component_options.length; i++) {
			var parts = component_options[i].split(':').map(s => s.trim());
			if (parts.length === 1 || parts[0] == value) {
				component_name = parts.pop();
				break;
			}
		}
		if (component_name) {
			const existing = element.getAttribute('data-component-id') || '';
			if (existing.indexOf(`c#${component_name}#`) === -1) {
				b8r.insertComponent(component_name, element, data);
			}
		}
	}
};

};