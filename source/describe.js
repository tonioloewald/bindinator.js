/**
# describe

A simple function for describing the values of things.

    const description = describe(variable_name, maxUniques=4, generic=false);

`maxUniques` determines how many items/keys it checks before giving up. If  `max_unqiues` is `-1`
then everything will be handled.

`generic` determines whether it returns `string` and `#` instead of literals.

**Note**: describe only checks the first two elements against each other to see if the array
is homogeneous.

~~~~
const {describe} = await import('../source/describe.js');
Test(() => describe(undefined)).shouldBe('undefined');
Test(() => describe(null)).shouldBe('null');
Test(() => describe(NaN)).shouldBe('NaN');
Test(() => describe(17)).shouldBe('17');
Test(() => describe(17, 4, true)).shouldBe('#');
Test(() => describe(true,)).shouldBe('true');
Test(() => describe(true, 4, true)).shouldBe('bool');
Test(() => describe(true)).shouldBe('true');
Test(() => describe('hello, world')).shouldBe('"hello, world"');
Test(() => describe('hello, world', 4, true)).shouldBe('string');
Test(() => describe([])).shouldBe('[]');
Test(() => describe({})).shouldBe('{}');
Test(() => describe([{x: 0, y: 0}, 17])).shouldBe('[{x,y}, 17]');
Test(() => describe([{x: 0, y: 0}]), 'handles single element').shouldBe('[{x,y} × 1]');
Test(() => describe([1,2,'a']), 'only checks first two elements').shouldBe('[1 × 3]');
Test(() => describe(["a",2,{}])).shouldBe('["a", 2, {}]');
Test(() => describe(["a",2,{}], 4, true)).shouldBe('[string, #, {}]');
Test(() => describe(["a",2,{},false,[]])).shouldBe('[* × 5]');
Test(() => describe(["a",2,{},false,[]], 5, true)).shouldBe('[string, #, {}, bool, []]');
Test(() => describe(["a",2,{}], 2)).shouldBe('[* × 3]');
Test(() => describe([1,2,3])).shouldBe('[1 × 3]');
Test(() => describe([1,2,3], 4, true)).shouldBe('[# × 3]');
Test(() => describe({y: 0, x: 1}) === describe({x: -2, y: 17})).shouldBe(true);
Test(() => describe([{x:0,y:0},{x:0,y:0},{x:0,y:0}])).shouldBe('[{x,y} × 3]');
Test(() => describe({a:0,b:1,c:2,d:3,e:4})).shouldBe('{a,b,c,d,…}');
Test(() => describe({a:0,b:1,c:2,d:3,e:4}, 5)).shouldBe('{a,b,c,d,e}');
Test(() => describe({a:0,b:1,c:2,d:3,e:4}, -1)).shouldBe('{a,b,c,d,e}');
Test(() => describe(function(x){})).shouldBe('function(x){...}');
Test(() => describe(window.open)).shouldBe('function(){[native code]}');
Test(() => describe(() => {})).shouldBe('()=>{...}');
Test(() => describe(x => {
  // newline in method body for test purposes
})).shouldBe('(x)=>{...}');
Test(() => describe((a, b=3) => {})).shouldBe('(a, b=3)=>{...}');
Test(() => describe((a, b={x: 17}) => {})).shouldBe('(a, b={x: 17})=>{...}');
Test(() => describe(async function(x,y,z){})).shouldBe('async (x,y,z)=>{...}');
~~~~
*/

export function describe (x, maxUniques = 4, generic = false) {
  if (x === undefined) {
    return 'undefined'
  } else if (Array.isArray(x)) {
    if (x.length === 0) {
      return '[]'
    } else if (x.length === 1 || typeof x[0] === typeof x[1]) {
      return `[${describe(x[0], maxUniques, generic)} × ${x.length}]`
    } else if (typeof x[0] !== typeof x[1]) {
      return x.length <= maxUniques || maxUniques < 0
        ? '[' + x.map(v => describe(v, maxUniques, generic)).join(', ') + ']'
        : `[* × ${x.length}]`
    }
  } else if (x && x.constructor === Object) {
    const keys = Object.keys(x)
    if (maxUniques >= 0 && keys.length > maxUniques) {
      keys.splice(maxUniques)
      keys.push('…')
    }
    return `{${keys.sort().join(',')}}`
  } else if (typeof x === 'string') {
    return generic ? 'string' : `"${x}"`
  } else if (x instanceof Function) {
    const source = x.toString()
    const args = source.match(/^(async\s+)?(function[^(]*\()?\(?(.*?)(\)\s*\{|\)\s*=>|=>)/m)[3].trim()
    const native = source.match(/\[native code\]/)
    const inside = native ? '[native code]' : '...'
    let desc = x.prototype || native ? `function(${args}){${inside}}` : `(${args})=>{${inside}}`
    if (source.startsWith('async')) {
      desc = 'async ' + desc
    }
    return desc
  } else if (isNaN(x)) {
    return 'NaN'
  } else if (typeof x === 'boolean') {
    return generic ? 'bool' : '' + x
  } else if (typeof x === 'number') {
    return generic ? '#' : '' + x
  } else {
    return JSON.stringify(x)
  }
}

export default describe
