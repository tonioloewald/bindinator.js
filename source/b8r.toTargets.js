// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
	# toTargets

	### flushing data to the DOM

	* value -- sets the element's value (works for input, select, textarea)
	* checked -- toggles the element's checked based on truthiness of value
	* text -- sets the element's textContent
	* attr(some_attribute) -- sets the element's specified attribute
	* style -- sets the element's specified style property
	* style(camelcaseProperty) -- sets the specified style attribute
	* style(camelcaseProperty,units) -- sets the specified style attribute, adding the units suffix (e.g. style(borderWidth,px)=.borderWidth)
	* class(class_name) -- toggles the specified class based on the truthiness of value
	* show_if -- shows the (otherwise hidden) element base on the truthiness of the value
	* show_if(value) -- shows the (otherwise hidden) element for matching value
	* method(model.method) -- calls the specified registered method, passing the element, valuem and the data object as parameters
	* component_map(value:component|other_value:other_component|yet_another_component) -- loads and binds the first matching component
	* json -- dumps the value stringified into the textContent of the element (mainly for debugging)

	### Comparison Values

	Used for comparison to certain values in conditional toTargets

	* \_true\_
	* \_false\_
	* \_undefined\_
	* \_null\_
*/
(function(module){

const special_values = {
	'_true_': true,
	'_false_': false,
	'_undefined_': undefined,
	'_null_': null,
};

function equals(value_to_match, value) {
	if (typeof value === 'string') value = value.replace(/\&nbsp;/g, '').trim();
	return special_values.hasOwnProperty(value_to_match) ? 
				 value_to_match === special_values[value] :
				 !!value;
}

module.exports = {
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
	img: function(element, value) {
		element.style.opacity = 0;
		if(!getComputedStyle(element).transition) {
			element.style.transition = '0.25s ease-out';
		}
		if (value) {
			const image = new Image();
			image.src = value;
			element.setAttribute('src', value);
			image.onload = () => element.style.opacity = 1;
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
	enabled_unless: function(element, value, dest) {
		element.disabled = equals(dest, value);
	},
	show_if: function(element, value, dest) {
		equals(dest, value) ? b8r.show(element) : b8r.hide(element);
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
				b8r.setByPath(id, dest, value);
			} else {
				console.error('component is not registered but is bound', element);
			}
		} else if (!element.getAttribute('data-component')) {	
			console.error('component toTarget found on non componennt', element);
		}
	},
	component_map: function(element, value, dest, data) {
		if (element.getAttribute('data-component-id')) {
			return;
		}
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
			b8r.insertComponent(component_name, element, data);
		}
	}
};

}(module));