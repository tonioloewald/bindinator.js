/**
# Exemplar.js — gradual typing by example
Copyright ©2016-2017 Tonio Loewald

Relatively painless gradual strong typing by example.

### exemplar: create type checkers by example

    exemplar(exampleValue)

Creates an exemplar that tests for values of the same type as `exampleValue`.

    exemplar({ ... }, true)

Creates an exemplar that checks for properties all the way down.

e.g.

    const numType = exemplar(1)

`numType` will return true for numbers and false for anything other than a
number.

    exemplar(some_function)

Creates an exemplar that behaves like the function, but it's an exemplar.

**Aside**: why use exemplars rather than just boolean test functions?
**exemplars** can be *specified*, combined, and also describe themselves.
They can also be used to drive the `childproof` function.

### Exemplar Methods

    exemplar.args(array)

Creates an exemplar for testing a sequence of arguments for childproofing a
function.
(Use types.noarguments for functions expecting no arguments.)

    exemplar.array(example)

Creates an exemplar that accepts an array of elements matching the example.

    exemplar.heteroArray(example, another_example, ...)

Creates an exemplar that accepts an array of elements matching one of the
provided examples.

    exemplar.regex(regular_expression)

Creates an exemplar that accepts strings that match the regular expression
provided.

    exemplar(...).describe(new_description)

Allows you to specify (override) the description of the method.

    exemplar(...).check(subject)

spams console.error if the subject is rejected

    exemplar(...).test(subject)

throw new Error(s if the subject is rejected)

### Specifiers

Specifiers allow you to tighten up an exemplar to accept very specific things.
E.g.

    exemplar({foo: 13})

creates an exemplar that accepts *any* object. But:

    exemplar({}).properties({foo: 13})

creates an exemplar that only accepts object with a property `foo` that is a
number.

    exemplar(...).optional()

will also accept `undefined`.

    exemplar(...).nullable()

will also accept `null`.

    exemplar(...).nonempty()

must have a numeric, positive length property.

#### Numeric specifiers

    exemplar(...).nonzero()
    exemplar(...).positive()
    exemplar(...).whole()
    exemplar(...).among()

#### Combining specifiers

    exemplar(...).and(exemplar_or_test_function)
    exemplar(...).or(exemplar_or_test_function)
    exemplar(...).not()

#### Object Specifiers

    exemplar(...).properties(object_example)

requires the object to have properties matching the example.

~~~~
const {exemplar} = await import('../lib/exemplar.js');
const numType = exemplar(1);
Test(() => numType(-11)).shouldBe(true);
Test(() => numType(Math.PI)).shouldBe(true);
Test(() => numType('3.14')).shouldBe(false);
Test(() => numType(true)).shouldBe(false);

const objType = exemplar({});
Test(() => objType({})).shouldBe(true);
Test(() => objType('test')).shouldBe(false);
Test(() => objType([])).shouldBe(false);

const geoTypeExample = {
  name: 'fred',
  position:{
    x: 10,
    y: 100,
    altitude: {distance: 10, unit: 'meters'}
  },
  list: [
    {x: 0, y: 1},
    {lat: 0, long: 90, altitude: 1000}
  ]
}
const geoType = objType.properties(geoTypeExample);
Test(() => geoType({})).shouldBe(false);
Test(() => geoType({name: 'anne', position: {}, list: []})).shouldBe(true);

const geoType2 = objType.properties({
  name: 'fred',
  position: objType.properties({x: 10, y: 100, altitude: {distance: 10, unit: 'meters'}}),
});
Test(() => geoType2({name: 'anne', position: {}})).shouldBe(false);
Test(() => geoType2({name: 'anne', position: {x: -5, y: 33}})).shouldBe(false);
Test(() => geoType2({name: 'anne', position: {x: -5, y: 33, altitude: {}}})).shouldBe(true);
Test(() => geoType2({name: 'anne', position: {x: -5, y: 33, altitude: {distance: 27000, unit: 'feet'}}})).shouldBe(true);

const geoType3 = exemplar(geoTypeExample, true);
Test(() => geoType3({name: 'anne', position: {}})).shouldBe(false);
Test(() => geoType3({name: 'anne', position: {x: -5, y: 33, altitude: {distance: '27000', unit: 'feet'}}, list: []})).shouldBe(false);
Test(() => geoType3({name: 'anne', position: {x: -5, y: 33, altitude: {distance: 27000, unit: 'feet'}}, list: []})).shouldBe(true);
Test(() => geoType3({name: 'anne', position: {
    x: -5, y: 33,
    altitude: {distance: 27000, unit: 'feet'}}, list: [
      {lat: 0, long: 90, altitude: 1000},
      {x: 0, y: 1}
    ]
  })).shouldBe(true);
  Test(() => geoType3({name: 'anne', position: {
    x: -5, y: 33,
    altitude: {distance: 27000, unit: 'feet'}}, list: [
      {lat: 0, long: 90, attitude: 1000},
      {x: 0, y: 1}
    ]
  })).shouldBe(false);
~~~~

### Childproof Functions

    childproof(function, expects, returns)

Produces a *childproofed* function that will throw new Error(if passed arguments other)
that it expects
or if it returns a value other than expected (returns is optional — if omitted,
the function
is expected *not* to return a value).

expects or returns are treated as type references if a string if passed, and
treated as
*/
/* global console, Element, NodeList */

'use strict'

const AND = (a, b) => a && b
const OR = (a, b) => a || b

const specifiers = {
  isExemplar: true,
  optional: function () {
    const test = this
    return exemplar(subject => test(subject) || types.undefined(subject))
      .describe(test.description + ' (optional)')
  },
  nullable: function () {
    const test = this
    return exemplar(subject => test(subject) || types.null(subject))
      .describe(test.description + ' OR null')
  },
  nonempty: function () {
    const test = this
    return exemplar(
      subject => test(subject) && types.number(subject.length) &&
                   subject.length > 0)
      .describe('non empty ' + test.description)
  },
  nonzero: function () {
    const test = this
    return exemplar(subject => test(subject) && subject !== 0)
      .describe('non-zero ' + test.description)
  },
  positive: function () {
    const test = this
    return exemplar(subject => test(subject) && subject > 0)
      .describe(test.descriotion = ' (>0)')
  },
  whole: function () {
    const test = this
    return exemplar(subject => test(subject) && types.int(subject))
  },
  among: function (options) {
    const test = this
    return exemplar(subject => test(subject) && options.indexOf(subject) > -1)
      .describe(`(${options.join('|')})`)
  },
  and: function (otherTest) {
    const test = this
    return exemplar(subject => test(subject) && otherTest(subject))
      .describe(`${test.description} and ${otherTest.description}`)
  },
  or: function (otherTest) {
    const test = this
    return exemplar(subject => test(subject) || otherTest(subject))
      .describe(`${test.description} or ${otherTest.description}`)
  },
  not: function () {
    const test = this
    return exemplar(subject => !test(subject))
      .describe('not ' + test.description)
  },
  properties: function (object, recursivelyCheckProperties = false) {
    const test = this
    const keys = Object.keys(object)
    const testMap = {}
    keys.forEach(key => {
      testMap[key] = exemplar(object[key], recursivelyCheckProperties)
    })
    const checkProps = subject =>
      keys.map(key => testMap[key](subject[key])).reduce(AND)
    const description = test.description + ' with properties ' +
        keys.map(key => `key (${testMap[key].description})`).join(', ')
    return exemplar(subject => test(subject) && checkProps(subject))
      .describe(description)
  },
  describe: function (description) {
    this.description = description
    return this
  },
  check: subject => {
    if (!this(subject)) {
      console.error('expected', this.description)
    }
  },
  test: subject => {
    if (!this(subject)) {
      throw new Error('expected ' + this.description)
    }
  }
}
Object.freeze(specifiers)

function exemplar (example, checkProperties = false) {
  if (this instanceof Function) { // jshint ignore:line
    throw new Error('use childproof to create create safer functions')
  }
  if (example && example.isExemplar) {
    return example
  }
  const type = typeof example
  let test; let description = type
  if (type === 'function') {
    description = 'passes ' + example.toString()
    test = subject => example(subject)
  } else if (type === 'object') {
    if (Array.isArray(example)) {
      if (example.length === 0) {
        description = 'array'
        test = subject => Array.isArray(subject)
      } else {
        return checkProperties
          ? exemplar.heteroArray(...(example.map(item => exemplar(item, true))))
          : exemplar.array(example[0])
      }
    } else {
      test = subject => typeof subject === 'object' && !Array.isArray(subject)
    }
  } else {
    test = subject => typeof subject === type // eslint-disable-line valid-typeof
  }
  test.description = description
  Object.assign(test, specifiers)
  if (checkProperties && type === 'object') test = test.properties(example, true)
  return test
}

exemplar.args = function (argumentList) {
  if (argumentList.length === 0) {
    return types.noarguments
  }
  const tests = argumentList.map(exemplar)
  return exemplar(
    args => tests.map((test, idx) => test(args[idx])).reduce(AND),
    '(' + tests.map(test => test.description).join(', ') + ')')
    .describe(`(${tests.map(test => test.description).join(', ')})`)
}

exemplar.array = function (test) {
  test = exemplar(test)
  return exemplar(
    args => !!args && (args.length === 0 || args.map(test).reduce(AND)),
    'array of ' + test.description)
}

exemplar.heteroArray = function (...args) {
  const tests = [].slice.apply(args).map(exemplar)
  return exemplar(
    args =>
      !!args &&
          (
            args.length === 0 ||
            args.map(arg => tests.map(test => test(arg)).reduce(OR))
              .reduce(AND)
          ),
    'array of ' + tests.map(test => test.description).join(', '))
}

exemplar.regex = function (testExpr, description) {
  const test = exemplar(s => typeof s === 'string' && !!s.match(testExpr))
  test.description = description || 'matches ' + testExpr.toString()
  return test
}

/**
### register(typeName, exemplar)

Adds the exemplar to types (and flags duplicates).

    register(exemplar)

Registers the exemplar as its description.

#### Predefined Types

    types.string
    types.stringArray
    types.number
    types.int
    types.cardinal
    types.boolean
    types.object
    types.array
    types.arrayish
    types.function
    types.promise
    types.nonemptyString
    types.undefined
    types.exemplar
    types.restMethod
    types.noarguments
    types.element
    types.nodeList

~~~~
const {exemplar, types} = await import('../lib/exemplar.js');

Test(() => types.string("hello")).shouldBe(true);
Test(() => types.string("")).shouldBe(true);
Test(() => types.string(17)).shouldBe(false);
Test(() => types.stringArray([])).shouldBe(true);
Test(() => types.stringArray(['hello', 'world'])).shouldBe(true);
Test(() => types.stringArray(['hello', 17,
'world'])).shouldBe(false);
Test(() => types.int(-17)).shouldBe(true);
Test(() => types.int(1.7)).shouldBe(false);
Test(() => types.cardinal(-17)).shouldBe(false);
Test(() => types.cardinal(0)).shouldBe(true);
Test(() => types.cardinal(17)).shouldBe(true);
Test(() => types.boolean(false)).shouldBe(true);
Test(() => types.boolean(0)).shouldBe(false);
Test(() => types.object({})).shouldBe(true);
Test(() => types.object('')).shouldBe(false);
Test(() => types.array([])).shouldBe(true);
Test(() => types.array({length:0})).shouldBe(false);
Test(() => types.arrayish({length:0})).shouldBe(true);
Test(() => types.arrayish({length:''})).shouldBe(false);
Test(() => types.function(function(){})).shouldBe(true);
Test(() => types.function(()=>{})).shouldBe(true);
Test(() => types.function(Object.assign)).shouldBe(true);
Test(() => types.promise(new Promise(() => {}))).shouldBe(true);
Test(() => types.undefined(undefined)).shouldBe(true);
Test(() => types.exemplar(types.int)).shouldBe(true);
Test(() => types.nonemptyString('hello')).shouldBe(true);
Test(() => types.nonemptyString('')).shouldBe(false);
Test(() => types.nonemptyString(null)).shouldBe(false);
Test(() => types.restMethod('info')).shouldBe(true);
Test(() => types.restMethod('pull')).shouldBe(false);
Test(() => types.noarguments({length:0})).shouldBe(true);
Test(() =>
types.element(document.createElement('div'))).shouldBe(true);
Test(() =>
types.nodeList(document.querySelectorAll('input'))).shouldBe(true);
~~~~
*/

const types = {
  string: exemplar(''),
  stringArray: exemplar.array(''),
  number: exemplar(0),
  int: exemplar(0).and(x => !(x % 1)), // jshint ignore:line
  cardinal: exemplar(0).whole().and(subject => subject >= 0),
  boolean: exemplar(true),
  object: exemplar({}).and(exemplar([]).not()).describe('object (NOT array)'),
  array: exemplar([]),
  arrayish: exemplar({})
    .and(subject => typeof subject.length === 'number')
    .describe('arrayish (has length)'),
  function:
      exemplar(subject => subject instanceof Function).describe('function'),
  promise: exemplar(new Promise(() => {})),
  nonemptyString: exemplar('').nonempty(),
  undefined: exemplar(undefined),
  exemplar: exemplar(subject => subject.isExemplar).describe('exemplar'),
  restMethod: exemplar.regex(/^(get|post|put|delete|info)$/i, 'REST method'),
  noarguments:
      exemplar(subject => subject.length === 0).describe('no arguments'),
  element: exemplar(subject => subject instanceof Element),
  nodeList: exemplar(subject => subject instanceof NodeList)
}

function register (name, type) {
  if (name.isExemplar) {
    type = name
    name = type.description
  }
  if (types[name]) {
    throw new Error(`${name} has already been registered`)
  }
  types[name] = type
}

function _childproof (unsafe, expects, returns) {
  if (unsafe.__unsafe) {
    return unsafe
  }
  if (types.array(expects)) {
    expects = exemplar.args(expects)
  }
  if (typeof expects === 'string') {
    expects = types[expects]
  }
  if (typeof returns === 'string') {
    returns = types[returns] || types.string
  } else {
    returns = exemplar(returns)
    if (returns.description === 'undefined') {
      returns.describe('no return value')
    }
  }
  const childproofed = function (...args) {
    if (!expects(args)) {
      debugger // eslint-disable-line no-debugger
      throw new Error('bad arguments, expected ' + expects.description)
    }
    const output = unsafe.apply(this, args)
    if (!returns(output)) {
      debugger // eslint-disable-line no-debugger
      throw new Error('bad output, expected ' + returns.description)
    }
  }
  childproofed.__unsafe = unsafe
  return childproofed
}

const childproof =
    _childproof // (_childproof,
// types.array.or(types.string).or(types.exemplar),
// types.exemplar.or(types.string).optional());

export { exemplar, register, types, childproof }
