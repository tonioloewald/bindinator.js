/**
# Exemplar.js — gradual typing by example
Copyright ©2016-2017 Tonio Loewald

Relatively painless gradual strong typing by example.

### exemplar: create type checkers by example

    exemplar(example_value)

Creates an exemplar that tests for values of the same type as `example_value`.

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

throws if the subject is rejected

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
const {exemplar} = _required_;
const numType = exemplar(1);
Test(() => numType(-11)).shouldBe(true);
Test(() => numType(Math.PI)).shouldBe(true);
Test(() => numType('3.14')).shouldBe(false);
Test(() => numType(true)).shouldBe(false);

const objType = exemplar({});
Test(() => objType({})).shouldBe(true);
Test(() => objType('test')).shouldBe(false);
Test(() => objType([])).shouldBe(false);

const geoType = objType.properties({name: 'fred', position:{x: 10, y: 100}});
Test(() => geoType({})).shouldBe(false);
Test(() => geoType({name: 'anne', position: {}})).shouldBe(true);

const geoType2 = objType.properties({name: 'fred',
position:objType.properties({x: 10, y: 100})});
Test(() => geoType2({name: 'anne', position: {}})).shouldBe(false);
Test(() => geoType2({name: 'anne', position: {x: -5, y: 33}})).shouldBe(true);
~~~~

### Childproof Functions

    childproof(function, expects, returns)

Produces a *childproofed* function that will throw if passed arguments other
that it expects
or if it returns a value other than expected (returns is optional — if omitted,
the function
is expected *not* to return a value).

expects or returns are treated as type references if a string if passed, and
treated as
*/
/* global module, console */
(function(module) {

  'use strict';

  const AND = (a, b) => a && b;
  const OR = (a, b) => a || b;

  const specifiers = {
    isExemplar: true,
    optional: function() {
      const test = this;
      return exemplar(subject => test(subject) || types.undefined(subject))
          .describe(test.description + ' (optional)');
    },
    nullable: function() {
      const test = this;
      return exemplar(subject => test(subject) || types.null(subject))
          .describe(test.description + ' OR null');
    },
    nonempty: function() {
      const test = this;
      return exemplar(
                 subject => test(subject) && types.number(subject.length) &&
                     subject.length > 0)
          .describe('non empty ' + test.description);
    },
    nonzero: function() {
      const test = this;
      return exemplar(subject => test(subject) && subject !== 0)
          .describe('non-zero ' + test.description);
    },
    positive: function() {
      const test = this;
      return exemplar(subject => test(subject) && subject > 0)
          .describe(test.descriotion = ' (>0)');
    },
    whole: function() {
      const test = this;
      return exemplar(subject => test(subject) && types.int(subject));
    },
    among: function(options) {
      const test = this;
      return exemplar(subject => test(subject) && options.indexOf(subject) > -1)
          .describe(`(${options.join('|')})`);
    },
    and: function(otherTest) {
      const test = this;
      return exemplar(subject => test(subject) && otherTest(subject))
          .describe(`${test.description} and ${otherTest.description}`);
    },
    or: function(otherTest) {
      const test = this;
      return exemplar(subject => test(subject) || otherTest(subject))
          .describe(`${test.description} or ${otherTest.description}`);
    },
    not: function() {
      const test = this;
      return exemplar(subject => !test(subject))
          .describe('not ' + test.description);
    },
    properties: function(object) {
      const test = this;
      const keys = Object.keys(object);
      const test_map = {};
      keys.forEach(key => test_map[key] = exemplar(object[key]));
      const checkProps = subject =>
          keys.map(key => test_map[key](subject[key])).reduce(AND);
      const description = test.description + ' with properties ' +
          keys.map(key => `key (${test_map[key].description})`).join(', ');
      return exemplar(subject => test(subject) && checkProps(subject))
          .describe(description);
    },
    describe: function(description) {
      this.description = description;
      return this;
    },
    check: subject => {
      if (!this(subject)) {
        console.error('expected', this.description);
      }
    },
    test: subject => {
      if (!this(subject)) {
        throw 'expected ' + this.description;
      }
    },
  };
  Object.freeze(specifiers);

  function exemplar(example) {
    if (this instanceof Function) {  // jshint ignore:line
      throw 'use childproof to create create safer functions';
    }
    if (example && example.isExemplar) {
      return example;
    }
    const type = typeof example;
    var test, description = type;
    if (type === 'function') {
      description = 'passes ' + example.toString();
      test = subject => example(subject);
    } else if (type === 'object') {
      if (Array.isArray(example)) {
        if (example.length === 0) {
          description = 'array';
          test = subject => Array.isArray(subject);
        } else {
          return exemplar.array(example[0]);
        }
      } else {
        test = subject => typeof subject === type && !Array.isArray(subject);
      }
    } else {
      test = subject => typeof subject === type;
    }
    test.description = description;
    Object.assign(test, specifiers);
    return test;
  }

  exemplar.args = function(argument_list) {
    if (argument_list.length === 0) {
      return types.noarguments;
    }
    const tests = argument_list.map(exemplar);
    return exemplar(
               args => tests.map((test, idx) => test(args[idx])).reduce(AND),
               '(' + tests.map(test => test.description).join(', ') + ')')
        .describe(`(${tests.map(test => test.description).join(', ')})`);
  };

  exemplar.array = function(test) {
    test = exemplar(test);
    return exemplar(
        args => args.length === 0 || args.map(test).reduce(AND),
        'array of ' + test.description);
  };

  exemplar.heteroArray = function(...args) {
    const tests = [].slice.apply(args).map(exemplar);
    return exemplar(
        args => args.length === 0 ||
            args.map(arg => tests.map(test => test(arg)).reduce(OR))
                .reduce(AND),
        'array of ' + tests.map(test => test.description).join(', '));
  };

  exemplar.regex = function(test_expr, description) {
    const test = exemplar(s => typeof s === 'string' && !!s.match(test_expr));
    test.description = description || 'matches ' + test_expr.toString();
    return test;
  };

/**
### register(type_name, exemplar)

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
    types.rest_method
    types.noarguments
    types.element
    types.nodeList

~~~~
const exemplar = _required_;

Test(() => exemplar.types.string("hello")).shouldBe(true);
Test(() => exemplar.types.string("")).shouldBe(true);
Test(() => exemplar.types.string(17)).shouldBe(false);
Test(() => exemplar.types.stringArray([])).shouldBe(true);
Test(() => exemplar.types.stringArray(['hello', 'world'])).shouldBe(true);
Test(() => exemplar.types.stringArray(['hello', 17,
'world'])).shouldBe(false);
Test(() => exemplar.types.int(-17)).shouldBe(true);
Test(() => exemplar.types.int(1.7)).shouldBe(false);
Test(() => exemplar.types.cardinal(-17)).shouldBe(false);
Test(() => exemplar.types.cardinal(0)).shouldBe(true);
Test(() => exemplar.types.cardinal(17)).shouldBe(true);
Test(() => exemplar.types.boolean(false)).shouldBe(true);
Test(() => exemplar.types.boolean(0)).shouldBe(false);
Test(() => exemplar.types.object({})).shouldBe(true);
Test(() => exemplar.types.object('')).shouldBe(false);
Test(() => exemplar.types.array([])).shouldBe(true);
Test(() => exemplar.types.array({length:0})).shouldBe(false);
Test(() => exemplar.types.arrayish({length:0})).shouldBe(true);
Test(() => exemplar.types.arrayish({length:''})).shouldBe(false);
Test(() => exemplar.types.function(function(){})).shouldBe(true);
Test(() => exemplar.types.function(()=>{})).shouldBe(true);
Test(() => exemplar.types.function(Object.assign)).shouldBe(true);
Test(() => exemplar.types.promise(new Promise(() => {}))).shouldBe(true);
Test(() => exemplar.types.undefined(undefined)).shouldBe(true);
Test(() => exemplar.types.exemplar(exemplar.types.int)).shouldBe(true);
Test(() => exemplar.types.nonemptyString('hello')).shouldBe(true);
Test(() => exemplar.types.nonemptyString('')).shouldBe(false);
Test(() => exemplar.types.nonemptyString(null)).shouldBe(false);
Test(() => exemplar.types.rest_method('info')).shouldBe(true);
Test(() => exemplar.types.rest_method('pull')).shouldBe(false);
Test(() => exemplar.types.noarguments({length:0})).shouldBe(true);
Test(() =>
exemplar.types.element(document.createElement('div'))).shouldBe(true);
Test(() =>
exemplar.types.nodeList(document.querySelectorAll('input'))).shouldBe(true);
~~~~
*/

  var types = {
    string: exemplar(''),
    stringArray: exemplar.array(''),
    number: exemplar(0),
    int: exemplar(0).and(x => !(x % 1)),
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
    rest_method: exemplar.regex(/^(get|post|put|delete|info)$/i, 'REST method'),
    noarguments:
        exemplar(subject => subject.length === 0).describe('no arguments'),
    element: exemplar(subject => subject instanceof Element),
    nodeList: exemplar(subject => subject instanceof NodeList),
  };

  function register(name, type) {
    if (name.isExemplar) {
      type = name;
      name = type.description;
    }
    if (types[name]) {
      throw `${name} has already been registered`;
    }
    types[name] = type;
  }

  function _childproof(unsafe, expects, returns) {
    if (unsafe.__unsafe) {
      return unsafe;
    }
    if (types.array(expects)) {
      expects = exemplar.args(expects);
    }
    if (typeof expects === 'string') {
      expects = types[expects];
    }
    if (typeof returns === 'string') {
      returns = types[returns] || types.string;
    } else {
      returns = exemplar(returns);
      if (returns.description === 'undefined') {
        returns.describe('no return value');
      }
    }
    const childproofed = function(...args) {
      if (!expects(args)) {
        debugger;  // jshint ignore:line
        throw 'bad arguments, expected ' + expects.description;
      }
      const output = unsafe.apply(this, args);
      if (!returns(output)) {
        debugger;  // jshint ignore:line
        throw 'bad output, expected ' + returns.description;
      }
    };
    childproofed.__unsafe = unsafe;
    return childproofed;
  }

  const childproof =
      _childproof;  //(_childproof,
                    //types.array.or(types.string).or(types.exemplar),
                    //types.exemplar.or(types.string).optional());

  module.exports = {exemplar, register, types, childproof};

}(module));
