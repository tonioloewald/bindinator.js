# Bind-O-Matic

Right now the index page is just [unit tests](https://cdn.rawgit.com/tonioloewald/Bind-O-Matic.js/master/). Ultimately my plan is to provide a demo page, and a literate programming environment with documentation, examples, and tutorials.

Makes data- and event-binding, and creating reusable components trivial so you can worry about other stuff.

* Write some HTML.
	* Data bindings are data-bind attributes
	* Event bindings are data-event attributes
* Load data (object) and register it -- it's automatically synced to DOM.
* Load controller (object) and register it -- it's already bound to events

Binding is asynchronous and lazy. In particular, event handlers are simply properties of HTML elements:

* If it's in the DOM, it's "bound"
* Binding on the server is the same as binding on client
* You don't need to parse the DOM to handle bindings (the browser is optimized for parsing and rendering HTML, so BOM doesn't do it).

To create HTML you write HTML. You don't write pseudo-HTML that compiles to Javascript that creates HTML.
Similarly, Bind-O-Matic does not need to parse the entire DOM before stuff starts working; you just load the HTML and it's good to go.

To "think the BOM way" you create a mock, add the appropriate attributes, and you're done.

In many frameworks adding an event handler to every node is an anti-pattern and can lead to horrible performance issues. BOM doesn't care if you do this, it's just node attributes.

You can see bindings in the DOM without needing to use special debugging tools. An element's data and event handlers are right there in the DOM, and you can easily see what's supposed to be happening and how things are wired together without spelunking dozens of source files and turning your brain inside-out.

Templates are _idempotent_ (a populated template is still a template with the same functionality it had before).

HTML this will load popupmenu.component.html:

	<div data-component="popupmenu"></div>

Javascript like this will load popupmenu.component.html dynamically:

	BOM.component("popupmenu").then(() => {BOM.loadComponent(someElement, "popupmenu")});

This binds the span's text to the 'name' property of the model 'user':

	<span data-bind="span = user.name">John Citizen</span>

This binds a click on the button to the 'cancel' method of the model 'ask'

	<button data-event="click: ask.cancel">Cancel</button>

This creates one list item (cloned from the original) for each element
in the 'list' property of the bound model:

	<ul>
		<li data-list="some_model.list" data-bind=".name">Friend</li>
	</ul>

If the user clicks on this button it will fire the method "bar" of the object registered as "foo":

	<button data-element="click:foo.bar">Hey Now!</button>

Components are HTML:

	<style>
		.test h2 { color: white; background-color: purple; }
		.test p { color: red; }
	</style>
	<h2>Test Component</h2>
	Bare text!
	<p>This is a test</p>
	<input data-bind="value=test1.sub.list[2]">
	<script>
		BOM.findOneWithin(component, 'h2').textContent = "Set on load";
		component.classList.add('test');
	</script>

The style tag is inserted as a stylesheet (once); the script is treated as a "load" method for the component, and is passed a reference
to the component's container element as "component".

## To Do

* Record messages for not-yet-loaded controllers, play them back when the controller is registered
* Record data-changes for not-yet-loaded models, play them back when the model is registed.
* Composable components (i.e. components that wrap their children)
* Literate programming implementation (ideally with js-fiddle-ish functionality)
