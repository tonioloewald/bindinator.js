// bindinator.js Copyright (c) 2016 Tonio Loewald
/**
	# fromTargets

	### collecting data from the DOM

	* value -- pulls the element's value from the DOM
	* checked -- pulls the element's checked value from the DOM
	* text -- pulls the element's textContent from the DOM
*/
(function(module){

module.exports = {
	value: function(element){
		return element.value;
	},
	checked: function(element) {
		return element.checked;
	},
	text: function(element){
		return element.textContent;
	},
	method: function(element, path) {
		var [model, ...method] = path.split('.');
		method = method.join('.');
		return b8r.getByPath(model, method)(element);
	}
};

}(module));