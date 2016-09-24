#BindOMatic

Binds your data and methods so you can concentrate on building new stuff.

	BOM(); // if you like automatic magic
	
	BOM.find();           // syntax sugar for querySelectorAll
	BOM.findOne();        // syntax sugar for querySelector
	BOM.id();             // syntax sugar for findElementById
	BOM.bind();           // bind all intrinsic data
	BOM.bind(element);    // bind all intrinsic data within element
	BOM.register(model_name, javascript_object); // register an object (controller or data)
	BOM.deregister(model_name); // deregister an object (controller or data)
	BOM.load();           // load all intrinsic components
	BOM.load(element);    // load intrinsic components within element
	BOM.load(element, url); // load intrinsic component at url into element
	BOM.unload(element);  // unload component (tell it first, cancellable)
	BOM.on(event_type, model_name, method_name) // creates an implicit event binding

Binding is asynchronous and can be lazy.

Templates are pure HTML.

Templates are idempotent (a populated template is still a template with the same functionality it had before).

This loads popupmenu.html and binds it to the message-actions model:

	<div data-load="popupmenu:message-actions"></div>

This binds the input's value to the 'title' property of the bound model:

	<input data-bind="value = .title">

This binds the span's text to the 'name' property of the model 'user':

	<span data-bind="span = user.name">John Citizen</span>

This binds a click on the button to the 'cancel' method of the model 'ask'

	<button data-event="click: ask.cancel">Cancel</button>

This creates one list item (cloned from the original) for each element
in the 'list' property of the bound model.

	<ul>
		<li data-list=".list" data-bind=".name">Friend</li>
	</ul>

The components are HTML:

	<style>
		label.dark {
			background-color: #444;
			color: #ccc;
		}
	</style>
	<label class="dark">
		<span data-bind=".label">label</span>
		<input data-replace="_children">
	</label>
	<script>
		// if this had a script it would be here
		find(label);
		BOM.
	</script>

##BindOMatic vs. Knockout

* Superficially similar when it comes to binding data, but can asynchronously bind to models (which allows lazy, late, and out-of-order binding.
* Different when it comes to events because they are bound the same way as data.
Templates are deliberately simple. No inline code because inline code is evil.
* No inline {variables} because that is not efficient for updates and requires parsing HTML before it goes into the DOM.