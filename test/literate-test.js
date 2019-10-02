/**
# Literate JS Viewer Test
Copyright ©2016-2017 Tonio Loewald

This file exists for the sole purpose of testing the b8r *literate programming* component.

> **Note** that one test deliberately throws an error so you can see the
> red notifier displayed at the bottom-right of the page.
*/
/* global module */

'use strict';

/**
## Inline Documentation

    add(a: number, b: number) => number

The add method adds its (numeric) argument and returns the result.

Here is an example. An example with no `<\w+[^<>]*>` (i.e. tag) in the text is
treated as pure javascript. Anything that looks like a tag will be treated
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

This is treated as pure Javascript:
```
const h4 = b8r.create('h4');
example.style.backgroundColor = 'darkgoldenrod';
h4.textContent = 'plain old javascript';
example.appendChild(h4);
return 'returned by example';
```

Markdown allows for two ways of embedding code, backquotes (used for examples)
and tildes (used for tests).
~~~~
const {add} = await import('../test/literate-test.js');

Test(() => add(1,1)).shouldBe(2);
Test(() => add(1,-1)).shouldBe(0);
Test(
  () => new Promise(
    resolve => {
      setTimeout(() => resolve(17), 2000)
    }
  ),
  'Async test takes 2s'
).shouldBe(17);
Test(() => add(1,1)).shouldNotBe(3);
Test(() => add(1,2), 'deliberate test failure').shouldNotBe(3); // expect failure
~~~~
*/

function add(a, b) {
  return a + b;
}

export {add};
