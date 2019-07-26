/**
# Type Checking By Example

The goal of this module is to provide simple type-checking by example.

General usage is:

    matchType(example, subject) // returns empty list if subject has same type as example
      // returns a list of problems discovered otherwise
E.g.

    matchType(0, 17) // [] -- 17 is a number and so is 0
    matchType('foo', 17) // false -- 17 is not a string

This is most useful when comparing objects, e.g.

    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 'world'}) // []
    matchType({foo: 17, bar: 'hello'}, {bar: 'world'}) // false -- foo is missing from subject
    matchType({foo: 17, bar: 'hello'}, {foo: 0, bar: 17}) // false -- expected bar to be a string

## Custom Types

A `Match` class which allows you to declare arbitrarily specific (or general) types. Usage:

    new Match(testFunc, typeDescription)

`testFunc` is a function that tests its first parameter and returns a string complaining
about what's wrong with it or nothing if it's OK.

    const wholeNumber = new Match(
      x => typeof x !== 'number' || isNaN(x) || x % 1 ? `was ${x}` : false,
      'whole number'
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
const {matchType, describe, oneOf, Match, nonEmpty, nullable, optional} = await import('./b8r.byExample.js');
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
}, 'cardinal number')
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

const wholeNumber = new Match(x => typeof x !== 'number' || isNaN(x) || x % 1 ? `was ${x}` : false, 'whole number')
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
~~~~
*/

export const describe = x => {
  if (x === null) return 'null'
  if (x instanceof Match) return x.description
  if (Array.isArray(x)) return 'array'
  if (typeof x === 'number' && isNaN(x)) return 'NaN'
  return typeof x
}

export class Match {
  constructor (testFunction, description) {
    this.test = testFunction
    this.description = description
  }
}

export const oneOf = (...options) => new Match(subject => {
  if (!options.includes(subject)) {
    return `was ${subject}`
  }
}, `one of ${options.join('|')}`)

export const nullable = (example, description = '') => new Match(subject => {
  if (subject !== null) {
    if (matchType(example, subject).length) return `was ${describe(subject)}`
  }
}, `${description || describe(example)} or null`)

export const optional = (example, description = '') => new Match(subject => {
  if (subject !== null && subject !== undefined) {
    if (matchType(example, subject).length) return `was ${describe(subject)}`
  }
}, `${description || describe(example)}, null, or undefined`)

export const nonEmpty = (example, description = '') => new Match(subject => {
  if (subject == null) return `was ${describe(subject)}`
  if (matchType(example, subject).length) return `was ${describe(subject)}`
  if (subject.length === 0) return 'has length 0'
}, `non-empty ${description || describe(example)}`)

export const matchType = (example, subject, errors = [], path = '', checkArrays = false) => {
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
    const count = checkArrays ? subject.length : 1
    if (example.length === 1 && subject.length) {
      // assume homogenous array
      for (let i = 0; i < count; i++) {
        matchType(example[0], subject[i], errors, `${path}[${i}]`, checkArrays)
      }
    } else if (example.length > 1 && subject.length) {
      // assume heterogeneous array
      for (let i = 0; i < count; i++) {
        let foundMatch = false
        for (let listItem of example) {
          if (matchType(listItem, subject[i], [], '', checkArrays).length === 0) {
            foundMatch = true
            break
          }
        }
        if (!foundMatch) errors.push(`${path}[${i}] had no matching type`)
      }
    }
  } else if (exampleType === 'object') {
    matchKeys(example, subject, errors, path, checkArrays)
  }
  return errors
}

const matchKeys = (example, subject, errors = [], path = '', checkArrays = false) => {
  for (let key of Object.keys(example).sort()) {
    matchType(example[key], subject[key], errors, path + '.' + key, checkArrays)
  }
  return errors
}
