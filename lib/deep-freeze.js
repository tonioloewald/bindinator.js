/**
# deepFreeze

Make objects immutable.

Usage:

    deepFreeze(obj throwErrorsOnSet=false);
      // if obj was an object, obj is now immutable
      // if throwErrorsOnSet, trying to change obj's properties will throw errors

`deepFreeze` is a non-shallow implementation of `Object.freeze` that
works "all the way down", but unlike the [example code on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) (as of writing)
it won't explode on circular references (because it doesn't recurse through
frozen objects) or properties set to null, and also will throw errors if
you attempt to write to the object (objects merely frozen using Object.freeze)
will let you set properties, but silently fail.

Note that if you try to add properties to a frozen object, it fails silently
and there's nothing that can be done about it.

### Why?

Rather than wishing, praying, or expecting callbacks (or whatever) not to
do stupid things, send them frozen objects and make them explode when they
cheat on you.

`throwErrorsOnSet` isn't cheap. In some simple experiments it looks to me
like calling deepFreeze(obj, true) is about 50x slower than calling
deepFreeze(obj). In concrete terms, in my [galaxy](https://loewald.com/galaxy)
demo if I freeze a galaxy of 5000 stars with 30k nested objects and 155k scalar
properties, it takes about 15ms on my current laptop, and about 200ms if
I make attempting to write to the properties using `freezeProperty` throw
errors.

~~~~
const {deepFreeze} = await import('../lib/deep-freeze.js');

const obj = {a: 'foo', b: {c: 'bar'}};
obj.a = 'hello';
obj.b.c = 'world';
Test(() => obj.a).shouldBe('hello');
Test(() => obj.b.c).shouldBe('world');
deepFreeze(obj, true);
Test(() => {obj.a = 'foobar'}).shouldThrow();
Test(() => {obj.b = 'foobar'}).shouldThrow();
Test(() => {obj.b.c = 'foobar'}).shouldThrow();
Test(() => obj.a).shouldBe('hello');
Test(() => obj.b.c).shouldBe('world');
~~~~
*/

const freezeProperty = (obj, prop) => {
  const val = obj[prop]
  Object.defineProperty(obj, prop, {
    writeable: false,
    enumerable: true,
    get () {
      return val
    },
    set (value) {
      throw new Error(`failed to set ${prop} on frozen object ${obj}`)
    }
  })
}

export const deepFreeze = (obj, throwErrorsOnSet = false) => {
  if (obj && obj.constructor && !Object.isFrozen(obj)) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      if (obj[key] && typeof obj[key] === 'object') {
        deepFreeze(obj[key], throwErrorsOnSet)
        if (throwErrorsOnSet) freezeProperty(obj, key)
      } else {
        if (throwErrorsOnSet) freezeProperty(obj, key)
      }
    }
    Object.freeze(obj)
  }
}

export default deepFreeze
