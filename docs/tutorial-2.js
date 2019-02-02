/**
# Tutorial 2. Simple Components

**Caution**: work in progress.

## A Simple Component

Components are self-contained, reusable, composible user interface elements.
Ideally they would simply allow you to implement custom tags, but the goal of
b8r is to avoid both pre-compilation and "magic".

A component looks like this (click the **Source** tab to view the source):

```
<!--
# documentation
-->
<style>
  .tutorial2:hover {
    color: red
  }
</style>
<button
  class="tutorial2"
  data-event="click:_component_.increment"
>
  Hello, component
</button>
<p data-bind="text=I have been clicked ${_component_.count} time[s]."></p>
<script>
  set({
    count: 0,
    increment: () => set('count', get('count') + 1),
  });
</script>
```

There are, in effect, four parts of a component:

* documentation (inside an HTML comment)
* a `<style>` tag
* some HTML
* a `<script>` tag

All of this goes in a single file named `component-name.component.html`.

Each of these parts is optional.

## Using Components

To use a component, you must load it, using b8r.component('path/to/component-name')
(note that you omit the `.component.html` portion of the file name). As soon as the
component becomes available it will automatically be inserted into any appropriately
marked element, e.g.:

    <div data-component="component-name"></div>

You can also explicitly load a component into an `element` using:

    b8r.insertComponent('component-name', element);

Or you can simply insert the component into a new element (at the bottom of the DOM)
by omitting the second argument:

    b8r.insertComponent('component-name', element);

And finally, if you want to load and insert exactly one instance of a component
you can use:

    b8r.componentOnce('path/to/component-name');

Here's a simple example of using a component:

```
<div data-component="switch"></div>
<script>
  b8r.component('./switch');
</script>
```

**Aside** each of these examples is, itself, a component!

## Binding Data to Components

## Handling events in Components

### Events can be handled by enclosing components

### Using Controllers
*/
