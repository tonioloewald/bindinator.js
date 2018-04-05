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

    createComponentFactory(Component)

So the script as a whole looks like this:

    return class extends Component {
      ...
    }

If you want code to execute when the component is inserted into the DOM, then implement
a `load` method. It has a much simpler signature than before:

    return class extends Component {
      load () {
        ... do stuff when component is first instanced
      }
    }

All the parameters in the old component's signature are now
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
