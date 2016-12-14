/**
# Exemplar.js -- typing by example

Copyright (c) 2016 Tonio Loewald

## Defining Types

exemplar.register(name, exemplar)
exemplar.signature(argument_signature_array, exemplar_return_type === undefined) // returns function exemplar
exemplar.optional(exemplar); turns an exemplar into an optional exemplar
exemplar.nullable(exemplar); turns an exemplar into a nullable exemplar
exemplar.oneOf(exemplar_array);
exemplar.exactly(exemplar_value);
exemplar.positiveLength(exemplar); turns an exemplar into a positive length exemplar
exemplar.exemplar(type_name OR constructor);
exemplar.check(name, subject) => true / false

### Predefined Types
types.undefined => the undefined exemplar
types.null => the null exemplar
types.string => the string exemplar
types.string.nullable
types.string.optional
types.string.matches(...)
types.string.oneOf(....)
types.string.positiveLength
types.number
types.number.whole
types.number.positive
types.number.negative
types.number.nonzero
types.boolean
types.array
types.array.positiveLength
types.object
types.node.
exemplar.exemplars.
*/
/* global module */
(function(module){

'use strict';

const bothTrue = (a, b) => a && b;

const specifiers = {
  isExemplar: true,
  optional: function(){
    const test = this;
    return exemplar(subject => test(subject) || types.undefined(subject));
  },
  nullable: function(){
    const test = this;
    return exemplar(subject => test(subject) || types.null(subject));
  },
  nonempty: function(){
    const test = this;
    return exemplar(subject => test(subject) && types.number(subject.length) && subject.length);
  },
  nonzero: function() {
    const test = this;
    return exemplar(subject => test(subject) && subject !== 0);
  },
  positive: function () {
    const test = this;
    return exemplar(subject => test(subject) && subject > 0);
  },
  whole: function() {
    const test = this;
    return exemplar(subject => test(subject) && types.whole(subject));
  },
  oneOf: function(options){
    const test = this;
    return exemplar(subject => test(subject) && options.indexOf(subject) > -1);
  },
  and: function(otherTest) {
    const test = this;
    return exemplar(subject => test(subject) && otherTest(subject));
  },
  or: function(otherTest) {
    const test = this;
    return exemplar(subject => test(subject) || otherTest(subject));
  },
  // given a list of examples, expect list of matches in that order
  sequence: function(list) {
    const test = this;
    return exemplar(subject => test(subject) && list.map(test => test(subject)).reduce(bothTrue));
  },
  // a list of the thing
  array: function() {
    const test = this;
    return exemplar(subject => types.arrayish(subject) && [].slice.apply(subject).map(item => test(item)).reduce(bothTrue));
  },
  properties: function(object) {
    const test = this;
    const checkProps = subject => Object.keys(object).map(key => exemplar(object[key])(subject[key])).reduce(bothTrue);
    return exemplar(subject => test(subject) && checkProps(subject));
  }
};
Object.freeze(specifiers);

function exemplar(example, expectation) {
  if (this instanceof Function) { // jshint ignore:line
    throw 'use childproof to create create safer functions';
  }
  if (example.isExemplar) {
    return example;
  }
  const type = typeof example;
  var test;
  if (type === 'function') {
    if(!expectation) expectation = 'pass test';
    test = subject => example(subject);
  } else {
    if(!expectation) expectation = '${type}';
    test = subject => typeof subject === type;
  }
  test.expectation = expectation;
  Object.assign(test, specifiers);
  return test;
}

function containsValue(object, value) {
  const keys = Object.keys(object);
  for(var i = 0, length = keys.length; i < length; i++) {
    if( object[keys[i]] === value ) {
      return true;
    }
  }
  return false;
}

var types = {
  string: exemplar(''),
  number: exemplar(0),
  int: exemplar(0).whole(),
  cardinal: exemplar(0).whole().and(subject => subject >= 0),
  'boolean': exemplar(true),
  'object': exemplar({}),
  'array': exemplar(subject => Array.isArray(subject)),
  'arrayish': exemplar({}).and(subject => subject.length !== undefined),
  'function': exemplar(subject => subject instanceof Function),
  type: subject => types.string(subject) && types[subject] || containsValue(types, subject),
  promise: exemplar(new Promise(() => {})),
  nonempty: exemplar(subject => types.number(subject) && subject.length),
  whole: exemplar(subject => subject % 1 === 0),
};

function register (name, type) {
  if(types[name]) {
    throw `${name} has already been registered`;
  }
  types[name] = type;
}

function _childproof(f, expects, returns) {
  if (types.array(expects)) {
    expects = types.array.sequence(expects);
  }
  if (typeof expects === 'string') {
    expects = types[expects];
  }
  if (typeof returns === 'string') {
    returns = types[returns];
  }
  const childproofed = function(){
    if(!expects(arguments)) {
      debugger; //jshint ignore:line
      throw 'bad arguments';
    }
    const output = f.apply(this, arguments);
    if(!returns(output)) {
      debugger; //jshint ignore:line
      throw 'bad output';
    }
  };
  childproofed.unsafe = f;
  return childproofed;
}

const childproof = _childproof(_childproof, [types['function'].or(types.string)], types.undefined);

module.exports = {
  exemplar,
  register,
  types,
  childproof
};

}(module));