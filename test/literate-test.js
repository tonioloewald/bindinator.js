/**
# Test Me!
Copyright ©2016-2017 Tonio Loewald

This file exists for the sole purpose of testing the b8r *literate programming* component.
*/
/* global module */

(function(module){
  'use strict'

/**
## add(a: number, b:number) => number

The add methods adds its (numeric) argument and returns the result.

Here is an example. An example with no <\w+> in the text is treated
as pure javascript. Anything that looks like a tag will be treated
as a component, as below:

```
<style>
  .test-calculator input { width: 100px; }

</style>
<div class="test-calculator" data-event="input,change:_component_.calculate">
  <input data-bind="value=_component_.a" type="number"> + 
  <input data-bind="value=_component_.b" type="number"> == 
  <input disabled data-bind="value=_component_.sum">
</div>
<script>
  // An example of test in action
  function calculate(){
    set({sum: get('a') + get('b')});
  }
  set({a: 5, b: Math.PI, calculate});
  calculate();
</script>
```

Markdown allows for two ways of embedding code, backquotes (used for examples)
and tildes (used for tests).
~~~~
// _required_ => require('path/to/the/module.js');
const {add} = _required_;

Test(() => add(1,1)).shouldBe(2);
Test(() => add(1,-1)).shouldBe(0);

// Expect failure!
Test(() => add(1,1)).shouldBe(3);
~~~~
*/

  function add(a, b) {
    return a + b;
  }

  module.exports = {add}
} (module));