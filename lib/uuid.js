/**
# uuid

A simple method for creading uuids. Usage:

        const uuid = require('path/to/uuid.js');
        const some_uuid = uuid();

~~~~
        const uuid = _required_;
        Test(() => uuid().match(/[0-9a-f]+/g).length).shouldBe(5);
        Test(() => uuid().match(/[0-9a-f]+/g).map(s => s.length)).shouldBeJSON([8,4,4,4,12]);
        Test(() => uuid().length).shouldBe(36);
        Test(() => uuid()).shouldNotBe(uuid());
~~~~
*/
/* global module, require */
'use strict';

const randomBytes =
  typeof window === 'undefined' ?
  () => {
    const node_crypto = require('crypto');
    return node_crypto.randomBytes(16);
  } :
  () => {
    const bs = new Uint8Array(16);
    window.crypto.getRandomValues(bs);
    return bs;
  };

module.exports = () => {
  // RFC 4122 version 4
  const ud = randomBytes();
  ud[8] = ud[8] >> 2 | (0b10 << 6); // clock_seq_hi_and_reserved
  ud[6] = ud[6] >> 4 | (0b0100 << 4); // time_hi_and_version
  let i = 0;
  return 'xxxx-xx-xx-xx-xxxxxx'.replace(/x/g, () =>
      (0xf00 | ud[i++]).toString(16).slice(1)
  );
};
