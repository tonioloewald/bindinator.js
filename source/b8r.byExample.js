/**
# Type Checking, Mocks By Example

The goal of this module is to provide simple, effective type-checking by example. Ultimately, it is
intended to afford both static analysis of `b8r` code and components and efficient
run-time checking of application state -- see [The Registry](#source=source/b8r.registry.js)
documentation for more information.

(WORK IN PROGRESS)
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

## Custom Types

A `Match` class which allows you to declare arbitrarily specific (or general) types. Usage:

    new Match(testFunc, typeDescription, generateMock)

- `testFunc` is a function that tests its first parameter and returns a string complaining
about what's wrong with it or nothing if it's OK.
- `typeDescription` describes the type
- `generateMock` is a function that produces example data that satisfies the textFunc

    const wholeNumber = new Match(
      x => typeof x !== 'number' || isNaN(x) || x % 1 ? `was ${x}` : false,
      'whole number',
      () => Math.floor(Math.random() * 100 - 50)
    )

## `describe`

A simple and useful wrapper for `typeof` is provided in the form of `describe` which
gives the typeof the value passed unless it's an `Array` (in which case it returns
'array') or `null` (in which case it returns 'null')

    describe([]) // 'array'
    describe(null) // 'null'

## Type Utilities

Some useful utilities (built using Match) are also provided, including `oneOf`,
`optional`, `nullable`, and `nonEmpty`.

    oneOf('a', 'b', 'c') // creates a type that will match one of the arguments provided

~~~~
const {
  matchType,
  describe,
  oneOf,
  Match,
  nonEmpty,
  nullable,
  optional,
  pickOne,
  exampleAtPath
} = await import('./b8r.byExample.js');

Test(() => matchType(0, 17)).shouldBeJSON([])
Test(() => matchType(0, 'hello')).shouldBeJSON(['was string, expected number'])
Test(() => matchType(false, true)).shouldBeJSON([])
Test(() => matchType(false, null)).shouldBeJSON(["was null, expected boolean"])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}))
  .shouldBeJSON([])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 'world'}))
  .shouldBeJSON([".foo was undefined, expected number"])
Test(() => matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}))
  .shouldBeJSON([".bar was number, expected string"])
Test(() => matchType({foo: 17, bar: 'hello'}, {bar: 17}))
  .shouldBeJSON([".bar was number, expected string", ".foo was undefined, expected number"])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: false}}}))
  .shouldBeJSON([])
Test(() => matchType({foo: {bar: {baz: true}}}, {foo: {bar: {baz: 17}}}))
  .shouldBeJSON([".foo.bar.baz was number, expected boolean"])
Test(() => matchType([], []))
  .shouldBeJSON([])
Test(() => matchType([1], []))
  .shouldBeJSON([])
Test(() => matchType([], [1]))
  .shouldBeJSON([])
Test(() => matchType(['hello'], ['world']))
  .shouldBeJSON([])
Test(() => matchType([false], ['world']))
  .shouldBeJSON(["[0] was string, expected boolean"])
Test(() => matchType([{x: 0, y: 17}], [{y: 0, x: 17}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}], [{y: 0}]))
  .shouldBeJSON(["[0].x was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}], [{x: 'world'}]))
  .shouldBeJSON(["[0].x was string, expected number", "[0].y was undefined, expected number"])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: 'baz'}]))
  .shouldBeJSON([])
Test(() => matchType([{x: 0, y: 17}, {foo: 'bar'}], [{foo: false}]))
  .shouldBeJSON(["[0] had no matching type"])

const cardinal = new Match(subject => {
  const subjectType = describe(subject)
  if (subjectType !== 'number') {
    return `was ${subjectType}`
  } else if (subject < 0) {
    return `was negative`
  } else if (subject % 1) {
    return `was not a whole number`
  }
}, 'cardinal number', () => 17)
Test(() => matchType(cardinal, 0))
  .shouldBeJSON([])
Test(() => matchType(cardinal, null))
  .shouldBeJSON(["was null, expected cardinal number"])
Test(() => matchType(cardinal, -1))
  .shouldBeJSON(["was negative, expected cardinal number"])

const requestType = oneOf('get', 'post', 'put', 'delete', 'head')
Test(() => matchType(requestType, 'post'))
  .shouldBeJSON([])
Test(() => matchType(requestType, 'save'))
  .shouldBeJSON(["was save, expected one of get|post|put|delete|head"])

const wholeNumber = new Match(
  x => typeof x !== 'number' || isNaN(x) || x % 1 ? `was ${x}` : false,
  'whole number',
  () => Math.floor(Math.random() * 100 - 50)
)
Test(() => matchType(wholeNumber, 11))
  .shouldBeJSON([])
Test(() => matchType(wholeNumber, 12.345))
  .shouldBeJSON(["was 12.345, expected whole number"])

const nonEmptyString = nonEmpty('test')
Test(() => matchType(nonEmptyString, 'hello'))
  .shouldBeJSON([])
Test(() => matchType(nonEmptyString, ''))
  .shouldBeJSON(["has length 0, expected non-empty string"])
Test(() => matchType(nonEmptyString, []))
  .shouldBeJSON(["was array, expected non-empty string"])

const nullableObject = nullable({})
Test(() => matchType(nullableObject, null))
  .shouldBeJSON([])
Test(() => matchType(nullableObject, 'hello'))
  .shouldBeJSON(["was string, expected object or null"])
const optionalArrayOfNumbers = optional([1], 'array<number>')
Test(() => matchType(optionalArrayOfNumbers))
  .shouldBeJSON([])
Test(() => matchType(optionalArrayOfNumbers, [1,2,3]))
  .shouldBeJSON([])
Test(() => matchType(optionalArrayOfNumbers, ['a','b','c']))
  .shouldBeJSON(['was array, expected array<number>, null, or undefined'])
Test(() => matchType(['a', 17], ['qq'], [], '', true))
  .shouldBeJSON([])
Test(() => matchType(['a', 17], [0, 'qq'], [], '', true))
  .shouldBeJSON([])
Test(() => matchType(['a', 17], [0, 'qq', {}], [], '', true))
  .shouldBeJSON(["[2] had no matching type"])
Test(() => new Match(x => typeof x === 'number' && x > 0, 'positiveNumber', -5))
  .shouldThrow()
  
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
  if (x instanceof Match) return x.description
  if (Array.isArray(x)) return 'array'
  if (typeof x === 'number' && isNaN(x)) return 'NaN'
  return typeof x
}

export const describeType = (x) => {
  const scalarType = describe(x)
  switch (scalarType) {
    case 'array':
      return x.map(describeType)
    case 'object':
      const _type = {}
      Object.keys(x).forEach((key) => { _type[key] = describeType(x[key]) })
      return _type
    default:
      return scalarType
  }
}

export const typeJSON = (x) => JSON.stringify(describeType(x))
export const typeJS = (x) => typeJSON(x).replace(/"(\w+)":/g, '$1:')

export class Match {
  constructor (testFunction, description, generateMock) {
    this.test = testFunction
    this.description = description
    if (typeof generateMock !== 'function') {
      throw new Error(`Match "${description}" requires generateMock to be specified`)
    }
    if (this.test(generateMock())) {
      throw new Error(`Match "${description}" mock() fails its own test!`)
    }
    this.mock = () => {
      let example
      do {
        example = generateMock()
      } while (example instanceof Match)
      return example
    }
  }
}

export const pickOne = (...array) => array[Math.floor(array.length * Math.random())]

export const oneOf = (...options) => new Match(subject => {
  if (!options.includes(subject)) {
    return `was ${subject}`
  }
}, `one of ${options.join('|')}`, () => pickOne(...options))

export const nullable = (example, description = '') => new Match(subject => {
  if (subject !== null) {
    if (matchType(example, subject).length) return `was ${describe(subject)}`
  }
}, `${description || describe(example)} or null`, () => pickOne(null, example))

export const optional = (example, description = '') => new Match(subject => {
  if (subject !== null && subject !== undefined) {
    if (matchType(example, subject).length) return `was ${describe(subject)}`
  }
}, `${description || describe(example)}, null, or undefined`, () => pickOne(null, undefined, example))

export const nonEmpty = (example, description = '') => new Match(subject => {
  if (subject == null) return `was ${describe(subject)}`
  if (matchType(example, subject).length) return `was ${describe(subject)}`
  if (subject.length === 0) return 'has length 0'
}, `non-empty ${description || describe(example)}`, () => example)

export const matchType = (example, subject, errors = [], path = '') => {
  if (example instanceof Match) {
    const outcome = example.test(subject)
    if (outcome) errors.push(`${path ? path + ' ' : ''}${outcome}, expected ${example.description}`)
    return errors
  }
  const exampleType = describe(example)
  const subjectType = describe(subject)
  if (exampleType !== subjectType) {
    errors.push(`${path ? path + ' ' : ''}was ${subjectType}, expected ${exampleType}`)
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
        for (let listItem of example) {
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
  if(example === null || example === undefined || parts.length === 0) {
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
  for (let key of Object.keys(example).sort()) {
    matchType(example[key], subject[key], errors, path + '.' + key)
  }
  return errors
}
