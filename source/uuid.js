/**
# uuid

Random and non-random unique ids. All generated using `crypto.getRandomValues`, i.e. a
[cryptographically strong random number generator](https://developer.mozilla.org/en-US/docs/Web/API/Crypto)

    import {uuid, unique, randId, now36, id} from 'path/to/uuid.js'

    // () => crypto.randomUUID()
    const myId = uuid()

Other ways of generating random / unique ids:

    // randpm string of digits in specified base
    const tenDigits = randId(10, 10)

    // default base is 36, this is a 20 digit string
    const uid = randId(20)

The convenience functions now36() and randId(length, base) can
be used to create very good ids

    // i.e. a unique id that is also going to sort into creation order
    // ms since epoch as 9-digit base 36 string + 11 digit base 36 digits
    // note that now36() will have a leading '0' until May 25th 2059
    const myId = now36() + randId(11)

    // or...
    const myId = id()

> ## Do not use `unique`
>
> The problem with this (deprecated) function is that it can cause subtle
> bugs if two different bits of code rely on different instances of this
> function in overlapping domains (e.g. two different functions can add
> elements with "unique" ids using different instances of `unique` to the 
> same array that are *very* likely not to be unique.)

Also, if you use `unique()` as a database key (which you should never ever
do) you are hosed.

The nice thing about id() is that it's pretty efficient, and it's not
going to bite you if you use it as a database key.
    
    // where practical, use id() instead
    const tempId = unique()

~~~~
const {uuid, unique, randId, now36, id} = await import('../source/uuid.js');
Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length)).shouldBeJSON([8,4,4,4,12]);
Test(() => uuid().length).shouldBe(36);
Test(() => uuid()).shouldNotBe(uuid());
// deprecated
// Test(() => unique()).shouldNotBe(unique());
// Test(() => unique() - unique()).shouldBe(-1);
Test(() => now36().length).shouldBe(9);
Test(() => Math.abs(parseInt(now36(), 36) - parseInt(now36(), 36)) > 1).shouldBe(false);
Test(() => Math.abs(parseInt(now36(), 36) - Date.now()) > 1).shouldBe(false);
Test(() => id().length).shouldBe(20);
Test(() => id().match(/[a-z0-9]{20,20}/)).shouldNotBe(null);
~~~~
*/


export const now36 = () => new Date(parseInt( '1000000000', 36) + Date.now()).valueOf().toString(36).slice(1)

export const randId = (length, base = 36) => {
  const squared = base * base
  const r = new Uint32Array(Math.ceil(length / 2))
  window.crypto.getRandomValues(r)
  return [...r].map(bytes => (squared + bytes % squared).toString(base)).slice(1).join('').substr(-length)
}

export const id = () => now36() + randId(11)

export const uuid = () => crypto.randomUUID()

let counter = 0
export const unique = () => {
  if (!counter) {
    console.warn('unique() is deprecated, use id() instead')
  } else {
    console.debug('unique() is deprecated, use id() instead')
  }
  counter += 1
  return counter
}

export default uuid
