# Bindinator Overview

b8r is a small javascript library that is designed to make working in vanilla javascript, html, and css as easy and productive — perhaps even easier and more productive — than working with far more complex, bloated frameworks. As a bonus, the demo page and demo components provide the basis for integrating documentation, examples, and tests with code ("literate programming").

## Registered Objects

Registered — **named** — objects are *the central idea* in b8r's architecture.

Registered objects are a kind of **observable**. But it's the *name* that's observed, not the *object* (i.e. you can bind to a registered object *by name* before the object itself is registered). This means you can bind to data before it's loaded, and events can trigger methods belonging to controllers before they are loaded, parsed, etc.

### Path References

b8r needs to know when things happen to registered objects (including their being registered in the first place). So, properties can be accessed (get and set) by **path** — where path is exactly what you'd expect.

	const obj = {foo: {bar: 'baz'}};
	b8r.register('bob', obj);
	b8r.getByPath('bob', 'foo.bar') === 'baz';
		// will be true
	b8r.setByPath('bob', 'foo.bar', 'hello');
		// obj is now {foo: {bar: 'hello'}}

These references are intended to be exactly what a javascript programmer would expect, e.g.

	const arr = [1,1,2,3,5,8,13];
	bar.register('fib', arr);
	b8r.getByPath('fib', '[3]') === 5;
		// will be true

Sometimes you'll need to simply tell b8r that something has changed (e.g. you might have completely rewritten a complex object, or not know exactly what was changed, or simply not want to bother figuring out what has changed), in which case:

	b8r.touchByPath('bob', 'foo');
		// tells b8r that the object registered as bob
		// has had the contents of foo changed

> Note that b8r tries to minimize DOM updates, but it doesn't maintain a "virtual DOM" of any kind. (If it becomes a performance issue, b8r may one day maintain a look-up table of bound elements rather than query the DOM when performing updates, but so far this has not been needed.)

### id paths

There's one wrinkle on paths that goes beyond javascript programming norms, and that is id paths. Instead of binding by index (e.g. `foo.bar[17]`) you can bind by an **id path**, e.g. `foo.bar[user.id=12341234]`. This is essentially saying, "give me the item in the list foo.bar that has user.id equal to '12341234'".

Instead of binding a list by index (the default) which would look like this:

	<li data-list="foo.bar:user.id">
		<span data-bind="text=.user.name"></span>
	</li>

You can provide an id path:

	<li data-list="foo.bar:user.id">
		<span data-bind="text=.user.name"></span>
	</li>

Among other things, paths allow lists to be updated more efficiently in the DOM, but they are also very useful for simply accessing
objects in lists using arbitrary keys.

## Events

### How Event Handling Works

b8r places one event handler for each type of event it handles on the **document.body** element, and each of those handlers is **captured** (i.e. cascades up the DOM hierarchy).

(TO DO need diagram showing hierarchy)

When an event is received, b8r looks at the event's target (the first element that received the event) and looks for a data-event on that element and its ancestors.

	<button data-event="mouseup:model.method">click me</button>

Events are bound to methods of registered objects by path name, the binding in effect says "when the button receives mouseup_event, b8r.getByPath('model', 'method')(mouseup_event)".

It's a little cleverer than that, see the note on *Asynchronous Event Binding* below.


#### Multiple Event Handers

	data-event="
		mouseover:_component_.show_info;
		mouseout:_component_.hide_info;
		click,keydown(Space):_component_.action;
	"

A **data-event** attribute may have multiple (semicolon-delimited) handlers in it, in which case they are examined from left-to-right. (Just as with the native event handlers, you can have multiple event handlers for the same kind of event if you so desire; but unlike adding an event listener you can see what's going on in the DOM, and so won't chase your tail as much if this situation arises accidentally.)

If b8r finds a suitable handler, it calls the method specified.

If the method does *not* return **true**, the event has been handled, otherwise b8r keeps walking up the DOM hierarchy until it reaches the topmost (body) element.

> ####Asynchronous Event Binding

> When an event is bound to an object, callMethod is used:

>		b8r.callMethod('model', 'method', mouse_event);

> And callMethod uses findByPath to check if model has been registered. If it has then it calls it on mouse_event. If it hasn't been registered, it records the message and plays it back (in order) *when the object is registered*.

### Any Event

Sometimes you want to intercept *any* event of a type. E.g. you might want a floating UI element to disappear if the mouse enters any element, but not want or be able to put handlers on those elements.

b8r implements "any" event handlers by creating a virtual "any" element which receives events before the target. Aside from being attached to an invisible DOM element, these event handlers work just like other event handlers (e.g. "eating" the event unless the handler returns true).

## Data Bindings

A b8r data-binding is expressed as **data-bind** attribute of the form **type** = **model** . **path**. A single element may have multiple (semicolon-delimited) data-bindings.

In b8r terms, a **to**-binding sends data from an object, using a path, *to* a DOM element's properties; a **from**-binding takes data *from* a DOM element to an object, using a path. Most bindings are one-way (to-bindings), while some are two-way (i.e. to and from) because most DOM properties only change programmatically.

The two most important bindings are value, checked, and text, all three work both ways.

	<input data-bind="value=bob.foo.bar">

A data-binding is, in effect, a collection of event bindings. E.g. in the case of the **input** element above, it's effectively this set of event handlers:

- when the object "bob" is registered, set the value of this input to bob.foo.bar
- if the input element's value is changed (i.e. an input or change event occurs) update bob.foo.bar with that value
- if the bob.foo.bar changes, update the element with the new value

The first item makes binding asynchronous (see note below).

b8r *actually inserts the input and change handlers into the DOM* when it first binds a value to the element. So, you can see them in the element inspector, and interrogate the element's properties in the console.

### List Binding

Often, you'll want to bind a list of things to the DOM. To simplify this, there's a **data-list** attribute:

	<h3 data-bind="text=_component_.title">Title</h3>
	<ul>
		<li
			data-list="_component_.items"
			data-bind="text=/"
		>list item</li>
	</ul>
	<script>
		const title = "Favorite Things";
		const items = [
			'Raindrops on roses',
			'whiskers on kittens',
			'Bright copper kettles',
			'warm woollen mittens',
			'Brown paper packages tied up with strings'
		];
		set({title, items});
	</script>

Obviously, that's a trivial example. The key thing to note is that you bind to properties of a list item using a "relative" binding path, so you could do something like this:

	<h3 data-bind="text=_component_.title">Title</h3>
	<ul>
		<li
			style="display: flex"
			data-list="_component_.items"
		>
			<span style="flex-grow: 1" data-bind="text=.title">item</span>
			<progress style="width:30px; flex-shrink: 0;" min=0 max=5 data-bind="value=.rating">>
		</li>
	</ul>
	<script>
		const title = "Favorite Things";
		const items = [
			{
				title:'Raindrops on roses',
				rating: 4.2
			},
			{
				title: 'whiskers on kittens',
				rating: 5
			},
			{
				title: 'Bright copper kettles',
				rating: 2.3
			},
			{
				title: 'warm woollen mittens',
				rating: 3.7
			},
			{
				title: 'Brown paper packages tied up with strings',
				rating: 5
			},
		];
		set({title, items});
	</script>

#### Note: Asynchronous Binding

b8r's data-binding is asynchronous if bound elements don't get added to the DOM once b8r starts up. So, if b8r is loaded at the bottom of the initial page and bound elements are only added using b8r's component system, everything just works and is asynchronous.

How?

When an object is registered, b8r looks for any elements bound to its name and binds them.

When a component is loaded, b8r examines it for any bound elements in it and if the object to which they are bound has been registered, binds the elements.

## Components

b8r's final core concept is the component. A component is written as a mini web page comprising:

	<style>
		... style declarations ...
	</style>
	... html markup ...
	<script>
		... view controller code ...
	</script>

Each of these pieces is *optional*.

### Using Components

Anywhere inside your page's markup you can add a component binding, like this:

	<div data-component="h2">
		Hello world
	</div>

When the component is loaded it will automatically be inserted elements bound to it. Let's suppose h2.component.html looks like this:

	<h2 data-children></h2>

You might load it thus:

	b8r.component('path/to/h2');

This returns a **promise** of the component, but you can ignore it unless you want code that only executes when the component is available. When the component is loaded an instance of the component inserted within the bound element, and the bound element's children (if any) will be moved to an element inside the component with the **data-children** attribute (if any).

> **Note**: if a component has no markup, elements bound to it will not be touched (so children will stay in place). This makes very lightweight script-only components easy to build.

### Talking to Components

b8r encourages programmers not to look outside the component's private context by making it harder to do so than to work within the context. (But it's not *hard*, just *not as easy* as doing the *right thing*.)

From the component's point of view, it receives a bunch of variables which give it information from the outside world, notably the **data** object, **component** -- a reference to the bound element, **get**, **set**, **find**, **findOne** methods, and a reference to **b8r**.

Each component instance has its data object registered with the name found in its **data-component-id** attribute, so getting at its data is straightforward. As far as the component itself is concerned, anything bound to _component_ will instead be bound to its instance id, making it easy to hook up properties and event handlers.

#### data

The data object is a reference to the data with which the component was initialized. This is:

- data explicitly when **insertComponent** was called (you probably won't call insertComponent very often, but when you bind an object with data, that data gets passed down to the component.
- data passed to the component by binding *before the component had been loaded*.
- serialized data in the bound element's **data-json** attribute.

#### Binding to Components

Components can bind to their own data and methods by using the model name _component_, e.g.

	<button
		data-bind="text=_component_.caption"
		data-event="click:_component_.show"
	>untitled</button>
	<input
		placeholder="enter message"
		data-bind="value=_component_.message"
	>
	<script>
		set({
			caption: 'hello',
			message: 'hello message',
			show: () => alert(get('message'))
		});
	</script>

I hope it's completely obvious what this does! And note that if two of these are in the same page they'll be perfectly independent.

> **Note**: in case you're concerned about, for example, instantiating thousands of components with their own even handlers, note that the script is turned into a function (and parsed and compiled) *once* only. (b8r is designed to be DRY for the coder and the CPU…) For extra efficiency, you can simply stick your methods in another module (and register them as a single controller object, if so desired).


#### Composing Components

As mentioned above, if a component has an element with a **data-children** attribute, its children will be replaced with the children of the bound element (if any). If the bound element has no children, the existing children are retained.

So given following markup:

	<div
		data-component="quotation"
		data-json='{"author":"b8r"}'
	>
		<h2>Hello</h2>
		<p>world</p>
	</div>

And the following component is registered as "quotation":

	<blockquote data-children>
		Experience is what you get when you didn't get what you wanted.
	</blockquote>
	<i data-bind="_component_.author">Randy Pausch</i>

You end up with this:

	<div
		data-component="composition-example"
		data-json='{"author":"b8r"}'
		data-component-id="c#composition-example#1"
	>
		<blockquote data-children>
			<h2>Hello</h2>
			<p>world</p>
		</blockquote>
		<i data-bind="_component_.author">b8r</i>
	</div>

### Data and Composition

In general, elements are bound to data by name (via DOM attributes) or explicitly (using `b8r.bindAll(element, data)`).

## How Components Work

A component is loaded and registered thus:

	b8r.component('something', 'components/my-product/something');

(It is assumed that the component's file name will end with `.component.html` -- in this case the file would be `something.component.html`; the goal is for the filename to be explicit but the code to contain minimal boilerplate.)

This could just as easily be:

	b8r.component('components/my-product/something');

If only one parameter is provided, it's assumed to be the path, and the name is assumed to be the trailing path component ('something' in this case).

`b8r.component(...)` returns a **promise** of the component record and then loads the provided path (appending `.component.html`).

When a component's source is received, the **\<style\>** tag (if any) is inserted into the document's **\<head\>**, the html is inserted into a **\<div\>** and the div as the component's **view** property (only the div's contents are used), and the **\<script\>** is made into a function and stored in the component's **load** property. The component is then **registered** (as a component, *not* in the main registered object pool).

Once a component is registered, any element bound to that component will have an instance of that component loaded into it. A component binding looks like this:

	<div data-component="something">...</div>

When a component is loaded, it will be inspected for nested bound components, and if available they will be loaded recursively; then data-bindings will be resolved.

> **Note**: there's a lot of asychronous stuff going on here, which you normally don't need to worry about, but be aware that the component's load method is called after the component itself is inserted, but nested components may not have loaded yet.

The element into which the component was loaded will be assigned a unique data-component-id attribute (referred to as "id" below) that is used to find the component's registered data (and also indicates which component it is an instance of).

As soon as the component is loaded, its view controller (the component's script) is called in a private context. (Under the food, the script has become the body of a load() function which is passed a bunch of useful parameters such as:

- **component** — a reference to the element into which the component was loaded
- **data** — the data object (if any) passed to the component instance when it was inserted
- **b8r** — a reference to bindator
- **find** — sugar for component.querySelectorAll
- **findOne** — sugar for component.querySelector
- **get** — sugar for path => b8r.findByPath(id, path)
- **set** — sugar for (path, value) => b8r.setByPath(id, path, value)
- **register** — sugar for data => b8r.register(id, data)

> **Note**: why use *register* instead of *set*? By default a component will be passed data bound to it, or the private data of its parent component. You can use register if you want to explicitly define a new private object.

A component can also be explicitly inserted into an element using:

	b8r.insertComponent(component, targetElement, data);

(This is the only mechanism, aside from DOM attributes, for directly passing data to a component, and any data passed to insertComponent will be received by the component's controller.)

### Components and Binding

A component's unique id is stored in its `data-component-id` attribute, which is the name under which its private data is registered.

Elements in components can be bound to registered objects in the normal way, but there are a few extra conveniences.

- The component's bound data object can be referred to in bindings as _component_. (This works for both data and event bindings, of course.) '_component_' will automatically be replaced with the component's id when the component is loaded.
- A component will receive its parent's bound data if no specific data is provided to it.
- Data can be explicitly bound to a component by using the **component** binding target (e.g. `data-bind="component=path.to.value"`)
- Data can be passed to a component as (url-escaped) json via the `data-json` attribute.

Copyright ©2016-2017 Tonio Loewald
