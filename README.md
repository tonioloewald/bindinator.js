<img alt="Bindinator b∞r logo" style="width: 90%; padding: 5%;" src="http://Bindinator.com/Bindinator-logo.svg">

<div style="text-align: center;"
[Home Page](http://Bindinator.com/) | [Demo (rawgit)](https://rawgit.com/tonioloewald/Bindinator.js/master/) | [Demo (cdn.rawgit)](https://rawgit.com/tonioloewald/Bindinator.js/master/) | [github](https://github.com/tonioloewald/Bindinator.js) | [Trello](https://trello.com/b/0OBL4IjC/Bindinator)
</div>

## A Virtuous Cycle

* To get views, write (reusable) HTML
* To get behavior, write (reusable) code.
* Models and controllers are just named objects
* Event and data bindings are just DOM attributes
* No new languages, templating languages, javascript extensions
* No compile step
* No magic. No spooky action-at-a-distance.
* Debug the code you write.

## In a Nut

A web application comprises DOM elements, in a web browser, styled with CSS and wired up to behaviors implemented in Javascript and data obtained from services.

Bindinator lets you build *views* using any mechanics you like, but HTML works just fine, style the *views* using CSS, and attach data and behavior to those views using DOM attributes, and implement the behavior using Javascript.

- You can create and destroy bindings using code, but this just creates and removes the relevant DOM attributes
- You can create the DOM elements using Javascript, but it's simpler and more direct to just write HTML
- Because bindings are just DOM attributes:
	- bindings and the things they're bound to can be loaded asynchronously
	- you don't need to tear down bindings when you throw away the associated view components, because the bindings are intrinsic to the view components

Bindinator lets you compose and reuse views as "components", where each component is a (hopefully) small self-contained file comprising the required HTML, CSS, and Javascript.

- Components strongly resemble simple web pages
- It's easy to break apart monolithic views into reusable components
- You don't need to "think in the Bindinator way" -- create what you want and it will work as expected

## Core Concepts

**Objects are registered by name** and then can have their properties and events bound to DOM elements with attributes:

- **data-bind** lets you bind data inside registered objects to targets within a DOM node (targets include text, value, checked state, visibility, class, attributes, style settings, and so forth).
- **data-event** lets you bind events to event handlers inside registered objects.
- **data-component** lets you bind composable component instances to DOM elements by name.
- **data-list** lets you bind a list to cloned instances of the bound element.

**Data bindings** are simply DOM attributes:

```
<input data-bind="value=foo.bar">
```

The input field will receive the property "bar" of whatever object is registered as "foo" (when it is registered), like this:

```
b8r.register('foo', {bar: 'hello world'});
```

Registering an object with a name causes it to be treated like a model, and bound (both ways) automatically.

**Event bindings** are just as straightforward:

```
<button event-bind="click:some.action">Click</button>
```

When the button is clicked the "action" method of whatever object is registered as "some" will be called, like this:

```
b8r.register('some', {action: () => alert('hello world')});
```

Registering an object with a name causes it to be treated like a controller as well. If an event occurs before the 
relevant controller is bound, the event will be replayed (in order) for the controller when it is registered.

**Multiple bindings** can be separated by semicolons, e.g.

```
<input data-bind="value=foo.bar;enabled_if(_true_)=privileges.edit">
<input type="range" data-event="input=slider.live_preview;change=slider.update">
```

**Multiple targets or event types** can be separated by commas, e.g.

```
	<span data-bind="style(backgroundColor),text=settings.color">#000000</span>
	<button data-event="mouseup,touchend:some.action">Click</button>
```

**Components** are just like web pages:

```
<style>
	/* style rules */
</style>
<button data-event="mouseup:_component_.count">Hello World</button>
<span></span>
<script>
	var times_clicked = 0;
	function count(){
		times_clicked += 1;
		findOne('span').textContent = times_clicked;
	}
	return {count};
</script>
```

The component's script executes in a private scope, so each instance will count its own clicks.

**Components are embedded** using attributes as well:

```
<div data-component="click-counter"></div>
```

When a component is loaded as "click-counter" it will automatically populate appropriately attributed divs.

Data can be bound to components:

```
<div 
	data-component="click-counter" 
	data-bind="component=path.to.data"
></div>
```

Components can bind to their own private data objects by using "_component_" so a component with:

```
<p data-bind="text=_component_.message"></p>
<button 
	data-event="click:_component_.doSomething"
>
	Click Me!
</button>
```

Can simply set its own properties and method:

```
set({
	message: 'hello',
	doSomething: () => {...} 
});
```

(Or have them set by bound data, etc.)

Copyright ©2016-2017 Tonio Loewald