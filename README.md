![bindinator b∞r logo](bindinator-logo.svg)

[Home Page](http://bindinator.com/) | [Demo (rawgit)](https://rawgit.com/tonioloewald/bindinator.js/master/) | [Demo (cdn.rawgit)](https://rawgit.com/tonioloewald/bindinator.js/master/) | [github](https://github.com/tonioloewald/bindinator.js) | [Trello](https://trello.com/b/0OBL4IjC/bindinator)

## A Virtuous Cycle

* To get views, write (reusable) HTML
* To get behavior, write (reusable) code.
* Models and controllers are just named objects
* Event and data bindings are just DOM attributes
* No new languages, templating languages, javascript extensions
* No compile step
* No magic. No spooky action-at-a-distance.
* Debug the code you write.

## Core Concepts

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