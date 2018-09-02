/**
# Components v2

> Work in progress!

A v2 component is a generalization of the original b8r component with some extra
nice properties.

A v1 component is, in effect, a v2 component with only a `load` method which inherits data
from its parent component by default

A v2 component is an instance of its class (a factory, but you don't need to know that)

## Creating a v2 component

A version 2 component can be recognized by its having a `<script data-version="2">` tag
instead of a plain `<script>` tag. Instead of the component's script being the body
of a function with the signature:

    load(require, component, b8r, find, findOne, data, register, get, set, on, touch);

A version 2 component simply defines a class that extends Component (in other words it
is the body of a function with the signature:

    createComponentFactory(require, b8r, Component)

So the script as a whole looks like this:

    return class extends Component {
      ...
    }

If you want code to execute when the component is inserted into the DOM, then implement
a `load` method. It has a much simpler signature than before:

Similarly, you can add a `destroy()` method that will be executed when the component is
"garbage collected" (i.e. when b8r notices it's been removed from the DOM).

    return class extends Component {
      load () {
        ... do stuff when component is first instanced
      }
    }

## Component base class

### Class Methods
    
    load(url[, name])               // load a component, returns promise of the class
    types()                         // all component types, map of names to classes
    insert(element, data)           // insert instance of component within element
    instances()                     // all component instances
    instances(component_name)       // instances of a given component type

### Properties

    this.id                         // component id
    this.element                    // the element into which the component was loaded

### Methods 

    closest()                       // nearest containing component
    closest(component_name)         // nearest containing component of type
    findOne(selector)               // first matching element inside element
    find(selector)                  // array of matching elements inside element
    on(event_type, path_to_method)  // add event binding to element
    set(path, value)                // set value in component instance
    get(path)                       // get value in component instance
    touch(path)                     // trigger updates in elements bound to path inside component

## Component Subclasses

### Methods

    create()                        // if defined, will be called by the base class Constructor before the instance is inserted into the DOM
    destroy()                       // if defined, will be called by b8r when the DOM is "garbage collected"

## Why V2?

V2 components are more efficient and convenient than the original version, and also don't pass 
their data onto their children.

- the old component `data` object is replaced with an instance of the component's class, in effect every component has a controller that's defined before it loads
- within a component's methods, you hardly need to use get (unless you want to access id-paths) since `get('foo.bar')` is `this.foo.bar`
- you can still use `this.set('payh.to.value', value)` to update values and trigger updates or `this.touch('path.to.value')` to trigger updates.
- you don't need to `set` or `register` component event handlers -- just define them in the class definition.

## Life Cycle
*/
/* global module */
'use strict';

class Component {
  static create(url, name) {

  }

  static create_v1(url, name) {
    return class extends Component {
      load () {
        f(require, component, b8r, find, findOne, data, register, get, set, on, touch);
      }
    }
  }

  insert (element, data) {

  }

  remove () {

  }

  destroy () {

  }
}

module.exports = Component;
