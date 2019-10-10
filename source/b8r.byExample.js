/**
# Type Checking, Mocks By Example

The goal of this module is to provide simple, effective type-checking "by example" -- i.e. in
most cases an example of a type can function as a type.

Certain specialized types — enumerations in particular — are supported in a way that still allows types
to be encoded as JSON. These types are specified using a string starting with a '#'. (It follows that
you shouldn't use strings starting with '#' as examples of strings.)

## Work in Progress

Ultimately, this module is intended to afford both static analysis of `b8r` code and components and efficient
run-time checking of application state -- see [The Registry](#source=source/b8r.registry.js)
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

`specficTypeMatch` is the function that evaluates matches against specific types. (Typically you
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
    specificTypeMatch('#int [0,∞]', -5)             === false  // -5 is less than 0
    specificTypeMatch('#int [0', -5)             === false  // -5 is less than 0
    specificTypeMatch('#int', Math.PI)           === false  // Math.PI is not a whole number
    specificTypeMatch('#number (0,4)', Math.PI)  === true   // 0 < Math.PI < 4

You can specify whole number types using '#int', and you can restrict #int and #number values
to **ranges** using, for example, '#int [0,10]' to specify any integer from 0 to 10 (inclusive).

Use parens to indicate exclusive bounds, so '#number [0,1)' indicates a number ≥ 0 and < 1.
(In case you're wondering, this is standard Mathematical notation.)

You can specify just a lower bound or just an upper bound, e.g. '#number (0' specifies a positive
number.

> #### More Types and Custom Types
>
> This mechanism will likely add new types as the need arises, and similarly may afford a
> convenient mechanism for defining custom types that require test functions to verify.

## `describe`

A simple and useful wrapper for `typeof` is provided in the form of `describe` which
gives the typeof the value passed unless it's an `Array` (in which case it returns
'array') or `null` (in which case it returns 'null')

    describe([]) // 'array'
    describe(null) // 'null'

~~~~
const {
  matchType,
  describe,
  exampleAtPath
} = await import('./b8r.byExample.js');

Test(() => matchType(0, 17)).shouldBeJSON([])
Test(() => matchType(0, 'hello')).shouldBeJSON(['was hello, expected number'])
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
Test(() => matchType('#number 0]', 6)).shouldBeJSON(['was 6, expected #number 0]'])
Test(() => matchType('#number 0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [-∞,0]', 6)).shouldBeJSON(['was 6, expected #number [-∞,0]'])
Test(() => matchType('#number [-∞,0]', -6)).shouldBeJSON([])
Test(() => matchType('#number [0,5]', Math.PI)).shouldBeJSON([])
Test(() => matchType('#number [0,2]', Math.PI)).shouldBeJSON([`was ${Math.PI}, expected #number [0,2]`])
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
Test(() => matchType(['hello'], ['world']))
  .shouldBeJSON([])
Test(() => matchType([false], ['world']))
  .shouldBeJSON(["[0] was world, expected boolean"])
Test(() => matchType([{x: 0, y: 17}], [{y: 0, x: 17}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}], [{y: 0}]))
  .shouldBeJSON(["[0].x was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}], [{x: 'world'}]))
  .shouldBeJSON(["[0].x was world, expected number", "[0].y was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: 'baz'}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: false}]))
  .shouldBeJSON(["[0] had no matching type"])

const requestType = '#enum "get"|"post"|"put"|"delete"|"head"'
Test(() => matchType(requestType, 'post'))
  .shouldBeJSON([])
Test(() => matchType(requestType, 'save'))
  .shouldBeJSON(['was save, expected #enum "get"|"post"|"put"|"delete"|"head"'])

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
*/

export const describe = x => {
  if (x === null) return 'null'
  if (Array.isArray(x)) return 'array'
  if (typeof x === 'number' && isNaN(x)) return 'NaN'
  if (typeof x === 'string' && x.startsWith('#')) return x
  return typeof x
}

const parseFloatOrInfinity = x => {
  if (x === '-∞') {
    return -Infinity
  } else if (x === '∞') {
    return Infinity
  } else {
    return parseFloat(x)
  }
}

const inRange = (spec, x) => {
  let lower, upper
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

export const specificTypeMatch = (type, subject) => {
  const [, baseType, , spec] = type.match(/^#([^\s]+)(\s(.*))?$/) || []
  const subjectType = describe(subject)
  switch (baseType) {
    case 'number':
      if (subjectType !== 'number') return false
      return inRange(spec, subject)
    case 'int':
      if (subjectType !== 'number' || subject !== Math.floor(subject)) return false
      return inRange(spec, subject)
    case 'enum':
      try {
        return spec.split('|').map(JSON.parse).includes(subject)
      } catch (e) {
        throw new Error(`bad enum specification (${spec}), expect JSON strings`)
      }
    default:
      throw new Error(`unrecognized type specifier ${type}`)
  }
}

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
    default:
      return scalarType
  }
}

export const typeJSON = (x) => JSON.stringify(describeType(x))
export const typeJS = (x) => typeJSON(x).replace(/"(\w+)":/g, '$1:')

export const matchType = (example, subject, errors = [], path = '') => {
  const exampleType = describe(example)
  const subjectType = describe(subject)
  const typesMatch = exampleType.startsWith('#')
    ? specificTypeMatch(exampleType, subject)
    : exampleType === subjectType
  if (!typesMatch) {
    errors.push(`${path ? path + ' ' : ''}was ${subject}, expected ${exampleType}`)
  } else if (exampleType === 'array') {
    // only checking first element of subject for now
    const count = subject.length
    if (example.length === 1 && count) {
      // assume homogenous array
      for (let i = 0; i < count; i++) {
        matchType(example[0], subject[i], errors, `${path}[${i}]`)
      }
    } else if (example.length > 1 && count) {
      // assume heterogeneous array
      for (let i = 0; i < count; i++) {
        let foundMatch = false
        for (const listItem of example) {
          if (matchType(listItem, subject[i], [], '').length === 0) {
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
