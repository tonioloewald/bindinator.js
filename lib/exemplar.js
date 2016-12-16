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
/* global module, console */
(function(module){

'use strict';

const AND = (a, b) => a && b;
const OR = (a, b) => a || b;

const specifiers = {
  isExemplar: true,
  optional: function(){
    const test = this;
    return exemplar(subject => test(subject) || types.undefined(subject)).describe(test.description + ' (optional)');
  },
  nullable: function(){
    const test = this;
    return exemplar(subject => test(subject) || types.null(subject)).describe(test.description + ' OR null');
  },
  nonempty: function(){
    const test = this;
    return exemplar(subject => test(subject) && types.number(subject.length) && subject.length).describe('non empty ' + test.description);
  },
  nonzero: function() {
    const test = this;
    return exemplar(subject => test(subject) && subject !== 0).describe('non-zero ' + test.description);
  },
  positive: function () {
    const test = this;
    return exemplar(subject => test(subject) && subject > 0).describe(test.descriotion = ' (>0)');
  },
  whole: function() {
    const test = this;
    return exemplar(subject => test(subject) && types.whole(subject));
  },
  oneOf: function(options){
    const test = this;
    return exemplar(subject => test(subject) && options.indexOf(subject) > -1).describe(`(${options.join('|')})`);
  },
  and: function(otherTest) {
    const test = this;
    return exemplar(subject => test(subject) && otherTest(subject)).describe(`${test.description} and ${otherTest.description}`);
  },
  or: function(otherTest) {
    const test = this;
    return exemplar(subject => test(subject) || otherTest(subject)).describe(`${test.description} or ${otherTest.description}`);
  },
  not: function() {
    const test = this;
    return exemplar(subject => !test(subject)).describe('not ' + test.description);
  },
  properties: function(object) {
    const test = this;
    const keys = Object.keys(object);
    const test_map = keys.map(key => exemplar(object[key]));
    const checkProps = subject => keys.map(key => test_map[key](subject[key])).reduce(AND);
    const description = test.description + ' with properties ' + keys.map(key => `key (${test_map[key].description})`).join(', ');
    return exemplar(subject => test(subject) && checkProps(subject)).description(description);
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
  if (this instanceof Function) { // jshint ignore:line
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
  } else if (Array.isArray(example)) {
    if (example.length === 0) {
      description = 'array';
      test = subject => Array.isArray(subject);
    } else {
      return exemplar.array(example[0]);
    }
  } else {
    test = subject => typeof subject === type;
  }
  test.description = description;
  Object.assign(test, specifiers);
  return test;
}

exemplar.args = function(argument_list){
  if(argument_list.length === 0) {
    return types.noarguments;
  }
  const tests = argument_list.map(exemplar);
  return exemplar(
    args => tests.map((test, idx) => test(args[idx])).reduce(AND), 
    '(' + tests.map(test => test.description).join(', ') + ')'
  ).describe(`(${tests.map(test => test.description).join(', ')})`);
};

exemplar.array = function(test) {
  test = exemplar(test);
  return exemplar(
    args => args.length === 0 || args.map(test).reduce(AND),
    'array of ' + test.description
  );
};

exemplar.heteroArray = function() {
  const tests = [].slice.apply(arguments).map(exemplar);
  return exemplar(
    args => args.length === 0 || args.map(arg => tests.map(test => test(arg)).reduce(OR)).reduce(AND), 
    'array of ' + tests.map(test => test.description).join(', ')
  );
};

exemplar.regex = function(test_expr, description) {
  const test = exemplar(s => typeof s === 'string' && !!s.match(test_expr));
  test.description = description || 'matches ' + test_expr.toString();
  return test;
};

var types = {
  string: exemplar(''),
  stringArray: exemplar.array(''),
  number: exemplar(0),
  int: exemplar(0).whole().describe('int'),
  cardinal: exemplar(0).whole().and(subject => subject >= 0),
  'boolean': exemplar(true),
  'object': exemplar({}).and(exemplar([]).not()).describe('object (NOT array)'),
  'array': exemplar([]),
  'arrayish': exemplar({}).and(subject => subject.length !== undefined).describe('arrayish (has length)'),
  'function': exemplar(subject => subject instanceof Function).describe('function'),
  promise: exemplar(new Promise(() => {})),
  nonempty: exemplar(subject => types.number(subject) && subject.length),
  undefined: exemplar(undefined),
  exemplar: exemplar(subject => subject.isExemplar).describe('exemplar'),
  rest_method: exemplar.regex(/^(get|post|put|delete|info)$/i, 'REST method'),
  noarguments: exemplar(subject => subject.length === 0).describe('no arguments'),
};

function register (name, type) {
  if(types[name]) {
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
    if(returns.description === 'undefined'){
      returns.describe('no return value');
    }
  }
  const childproofed = function(){
    if(!expects(arguments)) {
      debugger; //jshint ignore:line
      throw 'bad arguments, expected ' + expects.description;
    }
    const output = unsafe.apply(this, arguments);
    if(!returns(output)) {
      debugger; //jshint ignore:line
      throw 'bad output, expected ' + returns.description;
    }
  };
  childproofed.__unsafe = unsafe;
  return childproofed;
}

const childproof = _childproof; //(_childproof, types.array.or(types.string).or(types.exemplar), types.exemplar.or(types.string).optional());

module.exports = {
  exemplar,
  register,
  types,
  childproof
};

}(module));