/**
# Type Checking, Mocks By Example

The goal of this module is to provide simple, effective type-checking "by example" -- i.e. in
common cases an example of a type can function as a type.

Certain specialized types — enumerations in particular — are supported in a way that still allows types
to be encoded as JSON. These types are specified using a string starting with a '#'. (It follows that
you shouldn't use strings starting with '#' as examples of strings.)

## Work in Progress

Ultimately, this module is intended to afford both static analysis of `b8r` code and components and efficient
run-time checking of application state -- see [The Registry](?source=source/b8r.registry.js)
documentation for more information.

As a side-benefit, it is also capable of driving mock-data and optimistic rendering.
Annotations in example data can provide hints as to how to generate mock data for
testing purposes and for rendering user interfaces before live data is available.

General usage is:

    matchType(example, subject) // returns empty list if subject has same type as example
      // returns a list of problems discovered otherwise
E.g.

    matchType(0, 17) // [] -- no errors
    matchType('foo', 17) // ["was number, expected string"]

This is most useful when comparing objects, e.g.

    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}) // [] -- no errors
    matchType({foo: 17, bar: 'hello'}, {bar: 'world'}) // [".foo was undefined, expected number"]
    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}) // [".bar was number, expected string"]

If the example includes arrays, the elements in the array are assumed to be the valid examples
for items in the array, e.g.

    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], []) // [] -- no errors
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 10, y: 10}, {x: -1, y: -1}]) // []
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{lat: -20, long: 40, alt: 100}]) // []
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 5, y: -5}, {long: 20}])
      // ["[1] had no matching type"]
    matchType([{x: 0, y: 0}, {long: 0, lat: 0, alt: 0}], [{x: 5}, {long: 20}])
      // ["[0] had no matching type", "[1] had no matching type"]

For efficiency, put the most common example elements in example arrays first (since checks are
performed in order) and do not include unnecessary elements in example arrays.

## Specific Types

Some specific types can be defined using strings that start with '#'. (It follows that you should not
use strings starting with '#' as type examples.)

`specficTypeMatch` is the function that evaluates values against specific types. (Typically you
won't use it directly, but use matchType instead.)

    specificTypeMatch('#int [0,10]', 5) === true   // 0 ≤ 5 ≤ 10
    specificTypeMatch('#int [0', -5)    === false  // -5 is less than 0
    specificTypeMatch('#int', Math.PI)  === false  // Math.PI is not a whole number

### #enum

    specificTypeMatch('#enum true|null|false', null)                      === true
    specificTypeMatch('#enum true|null|false', 0)                         === false
    specificTypeMatch('#enum "get"|"post"|"put"|"delete"|"head"', 'head') === true
    specificTypeMatch('#enum "get"|"post"|"put"|"delete"|"head"', 'save') === false

You can specify an enum type simply using a bar-delimited sequence of JSON strings
(if you're transmitting a type as JSON you'll need to escape the '"' characters).

### #int and #number

    specificTypeMatch('#int [0,10]', 5)          === true   // 0 ≤ 5 ≤ 10
    specificTypeMatch('#int [0,∞]', -5)          === false  // -5 is less than 0
    specificTypeMatch('#int [0', -5)             === false  // -5 is less than 0
    specificTypeMatch('#int', Math.PI)           === false  // Math.PI is not a whole number
    specificTypeMatch('#number (0,4)', Math.PI)  === true   // 0 < Math.PI < 4

You can specify whole number types using '#int', and you can restrict #int and #number values
to **ranges** using, for example, '#int [0,10]' to specify any integer from 0 to 10 (inclusive).

Use parens to indicate exclusive bounds, so '#number [0,1)' indicates a number ≥ 0 and < 1.
(In case you're wondering, this is standard Mathematical notation.)

You can specify just a lower bound or just an upper bound, e.g. '#number (0' specifies a positive
number.

### #union

    specificTypeMatch('#union string||int', 0)                            === true
    specificTypeMatch('#union string||int', 'hello')                      === true
    specificTypeMatch('#union string||int', true)                         === false

You can specify a union type using #union followed by a '||'-delimited list of allowed
types. (Why '||'? '|' is quite common in regular expressions and you might want to use
a regex specified string type as an option.)

### #map

    specificTypeMatch('#map int', {foo: 17, bar: 25})                     === true
    specificTypeMatch('#map int', {foo: 17, bar: '25'})                   === false
    specificTypeMatch('#map union string||int', {foo: 17, bar: '25'})     === true

It's very common in Javascript to expect an object to simply be a sack of labelled values
of a certain type or types, e.g. you might represent a set of element styles as a map
from property names to their (string) values. Since the keys in a Javascript object are
strings (barring pathological cases) `#map`-types only specify the value type.

### #any

You can specify any (non-null, non-undefined) value via '#any'.

### #instance — built-in types

You can specify a built-in type, e.g. `HTMLElement` value via '#instance ConstructorName', in
this example '#instance HTMLElement'.

    matchType('#instance HTMLElement', document.body) // returns [] (no errors)

### #?... — optional types

You can denote an optional type using '#?<type>'. Both `null` and `undefined` are acceptable.

> #### More Types and Custom Types
>
> This mechanism will likely add new types as the need arises, and similarly may afford a
> convenient mechanism for defining custom types that require test functions to verify.

### #regexp — string tests

You can specify a regular expression test for a string value by providing the string you'd use
to create a `RegExp` instance. E.g. '#regexp ^\\d{5,5}$' for a simple zipcode type.

    matchType('#regexp ^\\d{5,5}$', '90210') // returns [] (no errors)
    matchType('#regexp ^\\d{5,5}$', '2350') // returns ["was "2350", expected #regexp \d{5,5}"]

## `describe`

A simple and useful wrapper for `typeof` is provided in the form of `describe` which
gives the typeof the value passed unless it's an `Array` (in which case it returns
'array') or `null` (in which case it returns 'null')

    describe([]) // 'array'
    describe(null) // 'null'
    describe(NaN) // 'NaN'
    describe(-Infinity) // 'number'

~~~~
// title: matchType tests
const {
  matchType,
  describe,
  exampleAtPath,
} = await import('./b8r.byExample.js');

Test(() => matchType(0, 17)).shouldBeJSON([])
Test(() => matchType(0, 'hello')).shouldBeJSON(['was \"hello\", expected number'])
Test(() => matchType(false, true)).shouldBeJSON([])
Test(() => matchType(false, null)).shouldBeJSON(["was null, expected boolean"])
Test(() => matchType('#int', 17)).shouldBeJSON([])
Test(() => matchType('#int [-5,5]', 5)).shouldBeJSON([])
Test(() => matchType('#int [-5,5)', 5)).shouldBeJSON(['was 5, expected #int [-5,5)'])
Test(() => matchType('#int [-5,5]', 6)).shouldBeJSON(['was 6, expected #int [-5,5]'])
Test(() => matchType('#int [-5,5)', -5)).shouldBeJSON([])
Test(() => matchType('#int (-5,5)', -5)).shouldBeJSON(['was -5, expected #int (-5,5)'])
Test(() => matchType('#int [-5,5]', -6)).shouldBeJSON(['was -6, expected #int [-5,5]'])
Test(() => matchType('#number (0', 6)).shouldBeJSON([])
Test(() => matchType('#number (0', -6)).shouldBeJSON(['was -6, expected #number (0'])
Test(() => matchType('#number (0,∞)', 6)).shouldBeJSON([])
Test(() => matchType('#number (0,∞)', -6)).shouldBeJSON(['was -6, expected #number (0,∞)'])
Test(() => matchType('#number (0,∞)', Infinity)).shouldBeJSON(['was Infinity, expected #number (0,∞)'])
Test(() => matchType('#number [-∞,∞)', -Infinity)).shouldBeJSON([])
Test(() => matchType('#number 0]', 6)).shouldBeJSON(['was 6, expected #number 0]'])
Test(() => matchType('#number 0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [-∞,0]', 6)).shouldBeJSON(['was 6, expected #number [-∞,0]'])
Test(() => matchType('#number [-∞,0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [0,5]', Math.PI)).shouldBeJSON([])
Test(() => matchType('#number [0,2]', Math.PI)).shouldBeJSON([`was ${Math.PI}, expected #number [0,2]`])
Test(() => matchType('#number', 6.022e+23)).shouldBeJSON([])
Test(() => matchType('#?number')).shouldBeJSON([])
Test(() => matchType('#any', {})).shouldBeJSON([])
Test(() => matchType('#?any', null)).shouldBeJSON([])
Test(() => matchType('#any', null)).shouldBeJSON(['was null, expected #any'])
Test(() => matchType('#any')).shouldBeJSON(['was undefined, expected #any'])
Test(() => matchType('#int', Math.PI)).shouldBeJSON([`was ${Math.PI}, expected #int`])
Test(() => matchType('#enum false|null|17|"hello"', null)).shouldBeJSON([])
Test(() => matchType('#enum false|null|17|"hello"', 17)).shouldBeJSON([])
Test(() => matchType('#enum false|null|17|"hello"', undefined)).shouldBeJSON(['was undefined, expected #enum false|null|17|"hello"'])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}))
  .shouldBeJSON([])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 'world'}))
  .shouldBeJSON([".foo was undefined, expected number"])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}))
  .shouldBeJSON([".bar was 17, expected string"])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 17}))
  .shouldBeJSON([".bar was 17, expected string", ".foo was undefined, expected number"])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: false}}}))
  .shouldBeJSON([])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: 17}}}))
  .shouldBeJSON([".foo.bar.baz was 17, expected boolean"])
Test(() => matchType([], []))
  .shouldBeJSON([])
Test(() => matchType([1], []))
  .shouldBeJSON([])
Test(() => matchType([], [1]))
  .shouldBeJSON([])
Test(() => matchType([], []))
  .shouldBeJSON([])
Test(() => matchType([], {}))
  .shouldBeJSON(["was object, expected array"])
Test(() => matchType({}, {}))
  .shouldBeJSON([])
Test(() => matchType({}, []))
  .shouldBeJSON(["was array, expected object"])
Test(() => matchType(['hello'], ['world']))
  .shouldBeJSON([])
Test(() => matchType([false], ['world']))
  .shouldBeJSON(["[0] was \"world\", expected boolean"])
Test(() => matchType([{x: 0, y: 17}], [{y: 0, x: 17}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}], [{y: 0}]))
  .shouldBeJSON(["[0].x was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}], [{x: 'world'}]))
  .shouldBeJSON(["[0].x was \"world\", expected number", "[0].y was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: 'baz'}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: false}]))
  .shouldBeJSON(["[0] had no matching type"])
Test(() => matchType('#instance HTMLElement', document.body))
  .shouldBeJSON([])
Test(() => matchType('#instance HTMLElement', {}))
  .shouldBeJSON(["was object, expected #instance HTMLElement"])
Test(() => matchType('#union string||int', 'foo')).shouldBeJSON([])
Test(() => matchType('#union string||int', 17)).shouldBeJSON([])
Test(() => matchType('#union string||int', null)).shouldBeJSON([
  "was null, expected #union string||int"
])
Test(() => matchType('#union string||int', false)).shouldBeJSON( [
  "was false, expected #union string||int"
])
Test(() => matchType('#?union string||int', null)).shouldBeJSON([])
Test(() => matchType('#?union string||int', 17)).shouldBeJSON([])

Test(() => matchType('#map int', {foo: 17, bar: -1}).length).shouldBe(0)
Test(() => matchType('#map int', {foo: 17.5, bar: -1}).length).shouldBe(1)
Test(() => matchType('#map number', {foo: 17.5, bar: -1}).length).shouldBe(0)
Test(() => matchType('#map union int||string', {foo: 'hello', bar: -1}).length).shouldBe(0)
Test(() => matchType('#map int', {}).length).shouldBe(0)

const requestType = '#enum "get"|"post"|"put"|"delete"|"head"'
Test(() => matchType(requestType, 'post'))
  .shouldBeJSON([])
Test(() => matchType(requestType, 'save'))
  .shouldBeJSON(['was \"save\", expected #enum "get"|"post"|"put"|"delete"|"head"'])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345'),
  'zipcode type'
).shouldBeJSON([])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345-6789'),
  'zipcode type'
).shouldBeJSON([])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '2350'),
  'australian postcodes are not zipcodes'
).shouldBeJSON(['was "2350", expected #regexp ^\\d{5,5}(-\\d{4,4})?$'])
Test(
  () => matchType('#regexp ^\\d{5,5}(-\\d{4,4})?$', '12345-679'),
  'extended zipcodes have a 4-digit extension'
).shouldBeJSON(['was "12345-679", expected #regexp ^\\d{5,5}(-\\d{4,4})?$'])

Test(() => exampleAtPath({foo: 17}, 'foo')).shouldBe(17)
Test(() => exampleAtPath({bar: 'hello'}, 'foo')).shouldBe(undefined)
Test(() => exampleAtPath({foo: [{bar: 'hello'}]}, 'foo')).shouldBeJSON([{"bar":"hello"}])
Test(() => exampleAtPath({foo: [{bar: 'hello'}]}, 'foo[]')).shouldBeJSON({"bar":"hello"})
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[]'))
  .shouldBeJSON({"bar":"hello",baz:17})
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].bar'))
  .shouldBe('hello')
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].baz'))
  .shouldBe(17)
Test(() => exampleAtPath({foo: [{bar: 'hello'}, {baz: 17}]}, 'foo[].hello'))
  .shouldBe(undefined)
~~~~

## Notes on Performance

I've done some rough performance testing of `typeSafe` and added a simple
optimization. The test code simply performed an add operation 1,000,000
times inline, wrapped in a function, wrapped in a trivial wrapper function, and
using a `typeSafe` function.

In essence, the overhead for typeSafe functions (on my recent, pretty fast,
Windows laptop) is about 350ms/million calls checked by typeSafe.

Note that many frameworks end up wrapping all your functions several times
for various reasons, doing non-trivial work in the wrapper. In any event,
if even _this_ much of an overhead is abhorrent, simply don't use typeSafe
in performance critical situations, or call it outside a loop rather than inside.

(E.g. if you're iterating across a lot of data in an array, typecheck a function
that takes the array, not a function that processes all the elements -- matchType
does not check every element of a large array.)

The obvious place to use typeSafe functions is when communicating with services,
and here any overhead is insignificant compared with network or I/O.
*/

export const isAsync = func => func && func.constructor === (async () => {}).constructor

export const describe = x => {
  if (x === null) return 'null'
  if (Array.isArray(x)) return 'array'
  if (typeof x === 'number') {
    if (isNaN(x)) return 'NaN'
  }
  if (typeof x === 'string' && x.startsWith('#')) return x
  if (x instanceof Promise) return 'promise'
  if (typeof x === 'function') {
    return x.constructor === (async () => {}).constructor
      ? 'async'
      : 'function'
  }
  return typeof x
}

const parseFloatOrInfinity = x => {
  if (x === '-∞') {
    return -Infinity
  } else if (x[0] === '∞') {
    return Infinity
  } else {
    return parseFloat(x)
  }
}

const inRange = (spec, x) => {
  let lower, upper
  if (spec === undefined) return true
  try {
    [, lower, upper] = (spec || '').match(/^([[(]-?[\d.∞]+)?,?(-?[\d.∞]+[\])])?$/)
  } catch (e) {
    throw new Error(`bad range ${spec}`)
  }
  if (lower) {
    const min = parseFloatOrInfinity(lower.substr(1))
    if (lower[0] === '(') {
      if (x <= min) return false
    } else {
      if (x < min) return false
    }
  }
  if (upper) {
    const max = parseFloatOrInfinity(upper)
    if (upper.endsWith(')')) {
      if (x >= max) return false
    } else {
      if (x > max) return false
    }
  }
  return true
}

const regExps = {}

const regexpTest = (spec, subject) => {
  const regexp = regExps[spec] ? regExps[spec] : regExps[spec] = new RegExp(spec)
  return regexp.test(subject)
}

export const specificTypeMatch = (type, subject) => {
  const [, optional, baseType, , spec] = type.match(/^#([?]?)([^\s]+)(\s(.*))?$/) || []
  if (optional && (subject === null || subject === undefined)) return true
  const subjectType = describe(subject)
  switch (baseType) {
    case 'any':
      return subject !== null && subject !== undefined
    case 'native':
      if (typeof subject !== 'function' || subject.toString() !== 'function () { [native code] }') {
        return false
      }
      if (!type) {
        return true
      }
      return isAsync(subject) ? type.match(/^async\b/) : type.match(/^function\b/)
    case 'function':
      if (subjectType !== 'function') return false
      // todo allow for typeSafe functions with param/result specified by name
      return true
    case 'number':
      if (subjectType !== 'number') return false
      return inRange(spec, subject)
    case 'int':
      if (subjectType !== 'number' || subject !== Math.floor(subject)) return false
      return inRange(spec, subject)
    case 'union':
      return !!spec.split('||').find(type => specificTypeMatch(`#${type}`, subject))
    case 'enum':
      try {
        return spec.split('|').map(JSON.parse).includes(subject)
      } catch (e) {
        throw new Error(`bad enum specification (${spec}), expect JSON strings`)
      }
    case 'void':
      return subjectType === 'undefined' || subjectType === 'null'
    case 'nothing':
      return subjectType === 'undefined'
    case 'string':
      return subjectType === 'string'
    case 'regexp':
      return subjectType === 'string' && regexpTest(spec, subject)
    case 'array':
      return Array.isArray(subject)
    case 'instance':
      return subject instanceof window[spec]
    case 'promise':
      return subject instanceof Promise
    case 'map':
      return !!subject && typeof subject === 'object' && !Array.isArray(subject) &&
          !Object.values(subject).find(v => !specificTypeMatch(`#${spec}`, v))
    case 'object':
      return !!subject && typeof subject === 'object' && !Array.isArray(subject)
    default:
      if (subjectType !== baseType) {
        console.error('got', subject, `expected "${type}", "${subjectType}" does not match "${baseType}"`)
        return false
      } else {
        return true
      }
  }
}

const functionDeclaration = /^((async\s+)?function)?\s*\((.*?)\)\s*(=>)?\s*\{/
const arrowDeclaration = /^((\.\.\.\w+)|(\w+)|\((.*?)\))\s*=>\s*[^\s{]/
const returnsValue = /\w+\s*=>\s*[^\s{]|\breturn\b/

export const describeType = (x) => {
  const scalarType = describe(x)
  switch (scalarType) {
    case 'array':
      return x.map(describeType)
    case 'object':
    {
      const _type = {}
      Object.keys(x).forEach((key) => { _type[key] = describeType(x[key]) })
      return _type
    }
    case 'function':
    case 'async':
    {
      const source = x.toString()
      if (source.startsWith('class ')) {
        return 'class'
      }
      if (source.endsWith('() { [native code] }')) {
        return `native ${scalarType}`
      }
      const functionSource = source.match(functionDeclaration)
      const arrowSource = source.match(arrowDeclaration)
      const hasReturnValue = source.match(returnsValue) || source.match(arrowDeclaration)
      const paramText = ((functionSource && functionSource[3]) ||
          (arrowSource && (arrowSource[2] || arrowSource[3] || arrowSource[4])) || '').trim()
      const params = paramText.split(',').map(param => {
        const [key] = param.split('=')
        return `${key} #any`
      })
      return `${scalarType} ( ${params.join(', ')} ) => ${hasReturnValue ? '#any' : '#nothing'}`
    }
    default:
      return scalarType
  }
}

export const typeJSON = (x) => JSON.stringify(describeType(x))
export const typeJS = (x) => typeJSON(x).replace(/"(\w+)":/g, '$1:')

const quoteIfString = (x) => typeof x === 'string' ? `"${x}"` : (typeof x === 'object' ? describe(x) : x)

// when checking large arrays, only check a maximum of 111 elements
function * arraySampler (a) {
  let i = 0
  // 101 is a prime number so hopefully we'll avoid sampling fixed patterns
  const increment = Math.ceil(a.length / 101)
  while (i < a.length) {
    // first five
    if (i < 5) {
      yield { sample: a[i], i }
      i++
    // last five
    } else if (i > a.length - 5) {
      yield { sample: a[i], i }
      i++
    } else {
    // ~1% of the ones in the middle
      yield { sample: a[i], i }
      i = Math.min(i + increment, a.length - 4)
    }
  }
}

export const matchType = (example, subject, errors = [], path = '') => {
  const exampleType = describe(example)
  const subjectType = describe(subject)
  const typesMatch = exampleType.startsWith('#')
    ? specificTypeMatch(exampleType, subject)
    : exampleType === subjectType
  if (!typesMatch) {
    errors.push(`${path ? path + ' ' : ''}was ${quoteIfString(subject)}, expected ${exampleType}`)
  } else if (exampleType === 'array') {
    // only checking first element of subject for now
    const sampler = subject.length ? arraySampler(subject) : false
    if (example.length === 1 && sampler) {
      // assume homogenous array
      for (const { sample, i } of sampler) matchType(example[0], sample, errors, `${path}[${i}]`)
    } else if (example.length > 1 && sampler) {
      // assume heterogeneous array
      for (const { sample, i } of sampler) {
        let foundMatch = false
        for (const specificExample of example) {
          if (matchType(specificExample, sample, [], '').length === 0) {
            foundMatch = true
            break
          }
        }
        if (!foundMatch) errors.push(`${path}[${i}] had no matching type`)
      }
    }
  } else if (exampleType === 'object') {
    matchKeys(example, subject, errors, path)
  }
  return errors
}

export const exampleAtPath = (example, path) => {
  const parts = Array.isArray(path)
    ? [...path]
    : path.replace(/\[[^\]]*\]/g, '.*').split('.')
  if (example === null || example === undefined || parts.length === 0) {
    return example
  } else {
    const part = parts.shift()
    if (part === '*') {
      if (Array.isArray(example)) {
        return example.length === 1
          ? exampleAtPath(example[0], parts)
          : exampleAtPath(Object.assign({}, ...example), parts)
      } else {
        return undefined
      }
    } else {
      return exampleAtPath(example[part], parts)
    }
  }
}

const matchKeys = (example, subject, errors = [], path = '') => {
  for (const key of Object.keys(example).sort()) {
    matchType(example[key], subject[key], errors, path + '.' + key)
  }
  return errors
}

/**
## Strongly Typed Functions

`typeSafe` adds run-time type-checking to functions, verifying the type of both
their inputs and outputs:

    import {typeSafe} from 'path/to/b8r.js'
    const safeFunc = typeSafe(func, paramTypes, resultType, name)

- `func` is the function you're trying to type-check.
- `paramTypes` is an array of types.
- `resultType` is the type the function is expected to return (it's optional).
- `name` is optional (defaults to func.name || 'anonymous')

For example:

    const safeAdd = typeSafe((a, b) => a + b, [1, 2], 3, 'add')

A typeSafe function that is passed an incorrect set of parameters, whose original
function returns an incorrect set of paramters will return an instance of `TypeError`.

`TypeError` is a simple class to wrap the information associated with a type-check failure.
Its instances five properties and one method:
- `functionName` is the name of the function (or 'anonymous' if none was provided)
- `isParamFailure` is true if the failure was in the inputs to a function,
- `expected` is what was expected,
- `found` is what was found,
- `errors` is the array of type errors.
- `toString()` renders the `TypeError` as a string

A typeSafe function that is passed or more `TypeError` instances in its parameters will return
the first error it sees without calling the wrapped function.

typeSafe functions are self-documenting. They have two read-only properties `paramTypes` and
`resultType`.

typeSafe functions are intended to operate like
[monads](https://en.wikipedia.org/wiki/Monad_(functional_programming)),
so if you call `safe_f(safe_g(...))` and `safe_g` fails, `safe_f` will _short-circuit_ execution and
return the error directly -- which should help with debugging and prevent code executing
on data known to be bad.

~~~~
const {
  matchParamTypes,
  typeSafe,
  TypeError,
} = await import('./b8r.byExample.js');

Test(() => matchParamTypes([1,2,3], [1,2,3])).shouldBeJSON([])
Test(() => matchParamTypes([1,'a',{}], [0,'b',{}])).shouldBeJSON([])
Test(() => matchParamTypes([1,'a'], [0,'b',{}]), 'extra parameters are ok').shouldBeJSON([])

const safeAdd = typeSafe((a, b) => a + b, [1, 2], 3, 'add')
Test(() => safeAdd(1,2), 'typesafe function works when used correctly').shouldBe(3)
Test(() => safeAdd(1).toString()).shouldBeJSON('add failed: bad parameter, [[],["was undefined, expected number"]]')

const badAdd = typeSafe((a, b) => `${a + b}`, [1, 2], 3, 'badAdd')
Test(() => badAdd(1,2).toString(), 'typesafe function fails with wrong return type')
  .shouldBeJSON('badAdd failed: bad result, ["was \\"3\\", expected number"]')

const labeller = typeSafe((label, number) => `${label}: ${number}`, ['label', 0], 'label: 17', 'labeller')
Test(() => labeller.paramTypes, 'typeSafe function has paramTypes').shouldBeJSON(['label',0])
Test(() => labeller.resultType, 'typeSafe function has resultType').shouldBe('label: 17')
Test(() => labeller.resultType = 'foo', 'typeSafe function props are read-only').shouldThrow()

const safeVectorAdd = typeSafe((a, b) => a.map((x, i) => x + b[i]), [[1], [2]], [3], 'vectorAdd')
Test(() => safeVectorAdd([1,2],[3,4])).shouldBeJSON([4,6])
Test(() => safeVectorAdd([1,2],[3,'x']).toString()).shouldBeJSON('vectorAdd failed: bad parameter, [[],["[1] was \\"x\\", expected number"]]')
Test(() => safeVectorAdd([1,2],[3]).toString()).shouldBeJSON('vectorAdd failed: bad result, ["[1] was NaN, expected number"]')
Test(() => safeVectorAdd([1,2], safeVectorAdd([1,2],[1,1])), 'chaining works').shouldBeJSON([3,5])
Test(() => safeVectorAdd([1,2],[1]) instanceof TypeError, 'failed function returns TypeError').shouldBe(true)
const inner = typeSafe((a, b) => a.map((x, i) => x + b[i]), [[1], [2]], [3], 'inner')
Test(() => inner([1,2],[1]) instanceof TypeError, 'failed function returns TypeError').shouldBe(true)
Test(() => inner([1,2],[1]).functionName, 'failed function returns name').shouldBe('inner')
Test(() => safeVectorAdd([1,2], inner([1,2],[1])).toString(), 'short circuit works').shouldBeJSON('inner failed: bad result, ["[1] was NaN, expected number"]')
~~~~
 */

export class TypeError {
  constructor ({
    functionName,
    isParamFailure,
    expected,
    found,
    errors
  }) {
    Object.assign(this, {
      functionName,
      isParamFailure,
      expected,
      found,
      errors
    })
  }

  toString () {
    const {
      functionName,
      isParamFailure,
      errors
    } = this
    return `${functionName} failed: bad ${isParamFailure ? 'parameter' : 'result'}, ${JSON.stringify(errors)}`
  }
}

const assignReadOnly = (obj, propMap) => {
  propMap = { ...propMap }
  for (const key of Object.keys(propMap)) {
    const value = propMap[key]
    Object.defineProperty(obj, key, {
      enumerable: true,
      get () {
        return value
      },
      set (value) {
        throw new Error(`${key} is read-only`)
      }
    })
  }
  return obj
}

export const matchParamTypes = (types, params) => {
  for (let i = 0; i < params.length; i++) {
    if (params[i] instanceof TypeError) {
      return params[i]
    }
  }
  const errors = types.map((type, i) => matchType(type, params[i]))
  return errors.flat().length ? errors : []
}

// TODO async function support

export const typeSafe = (func, paramTypes = [], resultType = undefined, functionName = undefined) => {
  const paramErrors = matchParamTypes(
    ['#function', '#?array', '#?any', '#?string'],
    [func, paramTypes, resultType, functionName]
  )
  if (paramErrors instanceof TypeError) return paramErrors

  if (!functionName) functionName = func.name || 'anonymous'
  let callCount = 0
  return assignReadOnly(function (...params) {
    callCount += 1
    const paramErrors = matchParamTypes(paramTypes, params)
    // short circuit failures
    if (paramErrors instanceof TypeError) return paramErrors

    if (paramErrors.length === 0) {
      const result = func(...params)
      const resultErrors = matchType(resultType, result)
      if (resultErrors.length === 0) {
        return result
      } else {
        return new TypeError({
          functionName,
          isParamFailure: false,
          expected: resultType,
          found: result,
          errors: resultErrors
        })
      }
    }
    return new TypeError({
      functionName,
      isParamFailure: true,
      expected: paramTypes,
      found: params,
      errors: paramErrors
    })
  }, {
    paramTypes,
    resultType,
    getCallCount: () => callCount
  })
}

function tsDescribe (x, name) {
  const b8rType = describe(x)
  switch (b8rType) {
    case 'array':
      return `Array<${x.length ? tsDescribe(x[0]) : 'any'}>`
    case 'object':
      return `{${
        Object.keys(x).map(key => `${key}: ${tsDescribe(x[key], null)}`).join(', ')
      }}`
    case 'null':
    case 'undefined':
      return 'any'
    default:
      switch (describeType(x).split(' ')[0]) {
        case 'class':
          return `class ${name || ''} { constructor(...args: any[]) }`
        case 'async':
        case 'function':
          return tsFunctionType(x, name)
        case 'native':
          return `function ${name} (...args:any[]): any  /* native */`
      }
      return b8rType
  }
}

function tsFunctionType (func, name) {
  const source = func.toString()
  const functionSource = source.match(functionDeclaration)
  const arrowSource = source.match(arrowDeclaration)
  const hasReturnValue = source.match(returnsValue) || source.match(arrowDeclaration)
  const paramText = ((functionSource && functionSource[3]) ||
      (arrowSource && (arrowSource[2] || arrowSource[3] || arrowSource[4])) || '').trim()
  const params = paramText ? paramText.split(',').map(param => {
    const [key] = param.split('=')
    return `${key.trim()}: any`
  }) : []
  return name
    ? `${isAsync(func) ? 'async ' : ''}function ${name} (${params.join(', ')}): ${hasReturnValue ? 'any' : 'void'}`
    : `(${params.join(', ')}) => ${hasReturnValue ? 'any' : 'void'}`
}

export function tsDeclaration (module) {
  const members = Object.keys(module).sort()
  return members.map(name => {
    const member = module[name]
    if (typeof member === 'function') {
      return `declare ${tsDescribe(member, name)}`
    } else {
      return `declare const ${name}: ${tsDescribe(member)}`
    }
  }).join('\n')
}
