# bindinator

[Home Page](http://bindinator.com/) | [Demo](https://cdn.rawgit.com/tonioloewald/bindinator.js/master/) | [Repo](https://github.com/tonioloewald/bindinator.js) | [Trello](https://trello.com/b/0OBL4IjC/bindinator)

## Better, Faster, Cheaper

* To get HTML, write HTML
* Logic is separate from presentation
* Models and Controllers are object
* Event and data-binding should be simple, easy, and debuggable
* No new languages or pseudo-languages, no compilation needed
* No magic. No spooky action-at-a-distance

## Core Concepts

**Data bindings** are simply DOM attributes:

```
	<input data-bind="value=foo.bar">
```

The input field will receive the property "bar" of whatever object is registered as "foo" (when it is registed).

```
	b8r.register('foo', {bar: 'hello world'});
```

**Event bindings** are just as straightforward:

```
	<button event-bind="mouseup,touchend:some.action">Click</button>
```

When the button is clicked the "action" method of whatever object is registered as "some" will be called.

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

Components can be embedded using attributes as well:

```
	<div data-component="click-counter"></div>
```

When a component is loaded as "click-counter" it will automatically populate appropriately attributed divs.