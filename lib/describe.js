/**
# describe

A simple function for describing the values of things.

    const description = describe(variable_name);

~~~~
const describe = _required_;
Test(() => describe(undefined)).shouldBe('undefined');
Test(() => describe(null)).shouldBe('null');
Test(() => describe(NaN)).shouldBe('NaN');
Test(() => describe(17)).shouldBe('17');
Test(() => describe('hello, world')).shouldBe('hello, world');
Test(() => describe([])).shouldBe('[]');
Test(() => describe({})).shouldBe('{}');
Test(() => describe([1,2,3])).shouldBe('[3 x 1]');
Test(() => describe([{x:0,y:0},{x:0,y:0},{x:0,y:0}])).shouldBe('[3 x {x,y}]');
Test(() => describe({a:0,b:1,c:2,d:3,e:4})).shouldBe('{a,b,c,d,…}');
~~~~
*/

function describe(x) {
  if (x === undefined) {
    return 'undefined';
  } else if (Array.isArray(x)) {
    return x.length ? `[${describe(x[0])} × ${x.length}]` : '[]';
  } else if (x && x.constructor === Object) {
    const keys = Object.keys(x);
    if (keys.length > 4) {
      keys.splice(4);
      keys.push('…');
    }
    return `{${keys.join(',')}}`;
  } else if (typeof x === 'string') {
    return x;
  } else if (isNaN(x)) {
    return 'NaN';
  } else {
    return JSON.stringify(x);
  }
}

module.exports = describe;
