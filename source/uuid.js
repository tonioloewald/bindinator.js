/**
# uuid

A simple method for creading uuids. Usage:

        import {uuid} = from 'path/to/uuid.js';
        const some_uuid = uuid();

Also provides a simpler `unique` method that returns a unique
counter every time it's called — for when `uuid()` is overkill.

    import {unique} from 'path/to/uuid.js'

~~~~
const {uuid, unique} = await import('../source/uuid.js');
Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length)).shouldBeJSON([8,4,4,4,12]);
Test(() => uuid().length).shouldBe(36);
Test(() => uuid()).shouldNotBe(uuid());
Test(() => unique()).shouldNotBe(unique());
~~~~
*/

const randomBytes =
  typeof window === 'undefined'
    ? () => {
      const nodeCrypto = require('crypto')
      return nodeCrypto.randomBytes(16)
    }
    : () => {
      const bs = new Uint8Array(16)
      window.crypto.getRandomValues(bs)
      return bs
    }

export const uuid = () => {
  // RFC 4122 version 4
  const ud = randomBytes()
  ud[8] = ud[8] >> 2 | (0b10 << 6) // clock_seq_hi_and_reserved
  ud[6] = ud[6] >> 4 | (0b0100 << 4) // time_hi_and_version
  let i = 0
  return 'xxxx-xx-xx-xx-xxxxxx'.replace(/x/g, () =>
    (0xf00 | ud[i++]).toString(16).slice(1)
  )
}

let counter = 0
export const unique = () => {
  counter += 1
  return counter
}

export default uuid
