# Bind-O-Matic

The index page is a skeletal [demo page](https://cdn.rawgit.com/tonioloewald/Bind-O-Matic.js/master/) with a link to the unit tests. 
Ultimately my plan is to flesh out the demo page, incluing a literate programming environment with documentation, examples, and tutorials. 

## A Virtuous Circle for Web Development

* The browser is good at parsing and rendering HTML as a DOM, so use HTML to represent the DOM
* Don't fight the browser's native functionality, leverage it
* Event and data-binding should be easy to do, fast and cheap (computationally), and easy to debug
* Impose as few restrictions as possible on the developer
* No magic. No spooky action-at-a-distance

Bind-O-Matic makes data- and event-binding, and creating reusable components trivial so you can worry about other stuff.

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

To "think the BOM way" you create a mock, add the appropriate attributes, and you're done (except for reducing repeating elements to a single template).

In many frameworks adding an event handler to every node is an anti-pattern and can lead to horrible performance issues, memory leaks, and so on. BOM doesn't care if you do this, it's all just node attributes.

You can see bindings in the DOM without needing to use special debugging tools. An element's data and event handlers are right there in the DOM, and you can easily see what's supposed to be happening and how things are wired together without spelunking dozens of source files and turning your brain inside-out.

It's easy to to add some simple CSS to make debugging even easier -- for example show bindings on mouseover.

Templates are _idempotent_ (a populated template is still a template with the same functionality it had before).

Using components is dead easy. HTML like this will load popupmenu.component.html:

	<div data-component="popupmenu"></div>

Javascript like this will load popupmenu.component.html dynamically:

	BOM.component("popupmenu").then(data => {BOM.loadComponent('popupmenu', data)});

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
		.hello-component > h4 {
			color: red;
		}
	</style>
	<div class="hello-component">
		<h4>Hello Component</h4>
		<div data-children>
			<!-- children of the element which loaded the component go here -->
		</div>
		<button data-event="click:_component_.button">Click Me</button>
	</div>
	<script>
		var times_clicked = 0;
		return {
			button: () => { findOne('h4').textContent = 'Clicked ' + ++times_clicked + ' times' }
		}
	</script>

The style tag is inserted as a stylesheet (once); the script is effectively treated as a "load" method for the component, and is passed references
to BOM, component (the element containing the component), find and findOne (within the component), and the data object passed to BOM.insertComponent.

Each component's script executes in a unique context.

## To Do

* Record messages for not-yet-loaded controllers, play them back when the controller is registered
* <del>Record data-changes for not-yet-loaded models, play them back when the model is registed.</del> (upon reflection, this seems like a very hypothetical use-case)
* Literate programming implementation (ideally with js-fiddle-ish functionality)
