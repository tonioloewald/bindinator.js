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

> ### Do not use `unique`
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

const {crypto} = window

/*
  Polyfill for crypto.randomUUID, taken from here:
  https://github.com/uuidjs/randomUUID/blob/main/randomUUID.js
*/
if(!crypto.randomUUID){
  class ERR_INVALID_ARG_TYPE extends TypeError {
    constructor(name, type, value) {
      super(`${name} variable is not of type ${type} (value: '${value}')`);
    }

    code = 'ERR_INVALID_ARG_TYPE';
  }

  //
  // internal/validators
  //

  function validateBoolean(value, name) {
    if (typeof value !== 'boolean') throw new ERR_INVALID_ARG_TYPE(name, 'boolean', value);
  }

  function validateObject(value, name) {
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      throw new ERR_INVALID_ARG_TYPE(name, 'Object', value);
    }
  }

  //
  // crypto
  //

  const randomFillSync = crypto.getRandomValues.bind(crypto);

  // Implements an RFC 4122 version 4 random UUID.
  // To improve performance, random data is generated in batches
  // large enough to cover kBatchSize UUID's at a time. The uuidData
  // and uuid buffers are reused. Each call to randomUUID() consumes
  // 16 bytes from the buffer.

  const kHexDigits = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];

  const kBatchSize = 128;
  let uuidData;
  let uuidNotBuffered;
  let uuid;
  let uuidBatch = 0;

  function getBufferedUUID() {
    if (uuidData === undefined) {
      uuidData = new Uint8Array(16 * kBatchSize);
    }

    if (uuidBatch === 0) randomFillSync(uuidData);
    uuidBatch = (uuidBatch + 1) % kBatchSize;
    return uuidData.slice(uuidBatch * 16, uuidBatch * 16 + 16);
  }

  function randomUUID(options) {
    if (options !== undefined) validateObject(options, 'options');
    const { disableEntropyCache = false } = { ...options };

    validateBoolean(disableEntropyCache, 'options.disableEntropyCache');

    if (uuid === undefined) {
      uuid = new Uint8Array(36);
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'.charCodeAt(0);
      uuid[14] = 52; // '4', identifies the UUID version
    }

    let uuidBuf;
    if (!disableEntropyCache) {
      uuidBuf = getBufferedUUID();
    } else {
      uuidBuf = uuidNotBuffered;
      if (uuidBuf === undefined) uuidBuf = uuidNotBuffered = new Uint8Array(16);
      randomFillSync(uuidBuf);
    }

    // Variant byte: 10xxxxxx (variant 1)
    uuidBuf[8] = (uuidBuf[8] & 0x3f) | 0x80;

    // This function is structured the way it is for performance.
    // The uuid buffer stores the serialization of the random
    // bytes from uuidData.
    // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    let n = 0;
    uuid[0] = kHexDigits[uuidBuf[n] >> 4];
    uuid[1] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[2] = kHexDigits[uuidBuf[n] >> 4];
    uuid[3] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[4] = kHexDigits[uuidBuf[n] >> 4];
    uuid[5] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[6] = kHexDigits[uuidBuf[n] >> 4];
    uuid[7] = kHexDigits[uuidBuf[n++] & 0xf];
    // -
    uuid[9] = kHexDigits[uuidBuf[n] >> 4];
    uuid[10] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[11] = kHexDigits[uuidBuf[n] >> 4];
    uuid[12] = kHexDigits[uuidBuf[n++] & 0xf];
    // -
    // 4, uuid[14] is set already...
    uuid[15] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[16] = kHexDigits[uuidBuf[n] >> 4];
    uuid[17] = kHexDigits[uuidBuf[n++] & 0xf];
    // -
    uuid[19] = kHexDigits[uuidBuf[n] >> 4];
    uuid[20] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[21] = kHexDigits[uuidBuf[n] >> 4];
    uuid[22] = kHexDigits[uuidBuf[n++] & 0xf];
    // -
    uuid[24] = kHexDigits[uuidBuf[n] >> 4];
    uuid[25] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[26] = kHexDigits[uuidBuf[n] >> 4];
    uuid[27] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[28] = kHexDigits[uuidBuf[n] >> 4];
    uuid[29] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[30] = kHexDigits[uuidBuf[n] >> 4];
    uuid[31] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[32] = kHexDigits[uuidBuf[n] >> 4];
    uuid[33] = kHexDigits[uuidBuf[n++] & 0xf];
    uuid[34] = kHexDigits[uuidBuf[n] >> 4];
    uuid[35] = kHexDigits[uuidBuf[n] & 0xf];

    return String.fromCharCode.apply(null, uuid);
  }

  crypto.randomUUID = randomUUID
}

export const now36 = () => new Date(parseInt('1000000000', 36) + Date.now()).valueOf().toString(36).slice(1)

export const randId = (length, base = 36) => {
  const squared = base * base
  const r = new Uint32Array(Math.ceil(length / 2))
  crypto.getRandomValues(r)
  return [...r].map(bytes => (squared + bytes % squared).toString(base)).slice(1).join('').substr(-length)
}

export const id = () => now36() + randId(11)

export const uuid = crypto.randomUUID.bind(crypto)

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
