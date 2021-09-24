/**
# monadic

`monadic()` leverages the `byExample` type library to produce
a typesafe monadic function from a config object, thus:

    const vecLength = monadic({
      defaultInput: {x: 0, y: 0},
      inputType: {x: 0, y: 0},
      outputType: {size: 0},
      func: ({x, y}) => ({ size: Math.sqrt(x * x + y * y) })
    })

`monadic()` treats concrete values in the inputType as default values (so passing
them is optional). If you want nullable values of a specific type they need to be declared
as `'#?...'`. If you require a type and want no default value, you need to specify
it via string (e.g. `#number` vs. 0).

E.g. this function takes a value and a quantity and returns a product.
If the value is a number then it returns value x quantity.
If the value is a string it returns quantity iterations of the string.
If quantity is not provided, the value is returned.

    const mult = monadic({
      inputType: {value: '#union string||number', quantity: 1},
      outputType: {product: '#union string||number'),
      func({value, quantity}) {
        let product = ''
        if (typeof value === 'string') {
          for(let i = 0; i < quantity; i++) {
            product += value
          }
        } else {
          product = value * quantity
        }
        return { product }
      }
    })

Note that `monadic` is a monad.

### async monads

`monadic` is synchronous, but it will create async monads
from async functions. The resulting monad will await its input before
checking its type, and then await its output before checking its type.

~~~~
const {
  monadic,
} = await import('./monadic.js')

const vecLengthDefaults = {x: 0, y: 0}
const vecLength = monadic({
  defaultInput: {x: 0, y: 0},
  outputType: {size: 0},
  func({x, y}){
    return { size: Math.sqrt(x * x + y * y) }
  }
})

Test(() => typeof vecLength).shouldBeJSON('function')
Test(() => vecLength({x: 0, y: 0})).shouldBeJSON({size: 0})
Test(() => vecLength()).shouldBeJSON({size: 0})
Test(() => vecLength({x: false, y: 0})).shouldBeInstanceOf(Error)
Test(() => vecLength({x: 3, y: 4})).shouldBeJSON({size: 5})
Test(() => vecLength({x: 3})).shouldBeJSON({size: 3})
Test(() => vecLength({y: 17})).shouldBeJSON({size: 17})
Test(() => vecLength({x: 3, y: false})).shouldBeInstanceOf(Error)
Test(() => vecLength({x: 3, y: '4'})).shouldBeInstanceOf(Error)
Test(() => true).shouldBe(true)
const asyncAdd = monadic({
  inputType: {x: 0},
  outputType: {x: 1},
  func: async ({x}) => ({x: x + 1})
})
Test(() => asyncAdd.constructor).shouldBe((async () => {}).constructor)
Test(() => asyncAdd({x: 2})).shouldBeJSON({x: 3})
Test(() => asyncAdd(Promise.resolve({x: 2}))).shouldBeJSON({x: 3})

const mult = monadic({
  defaultInput: {
    a: 0,
    b: 1
  },
  inputType: {
    a: '#union number||string||array',
    b: 1,
  },
  outputType: {
    product: '#union string||number'
  },
  func({a, b}){
    let product = ''
    if (Array.isArray(a)) {
      if (typeof a[0] === 'number') {
        a = a.reduce((p = 1, x) => p * x)
      } else {
        a = a.reduce((p, x) => p ? p + ` x ${x}` : x)
      }
    }
    if (typeof a === 'number') {
      product = a * b
    } else {
      for(i = 0; i < b; i++) {
        product += a
      }
    }
    return { product }
  }
})

Test(() => mult({a: 3, b: 4}).product).shouldBe(12)
Test(() => mult({a: 3, b: false}).constructor).shouldBe(Error)
Test(() => mult({a: [1,2,3,4]}).product).shouldBe(24)
Test(() => mult({a: ['1',2,3,4]}).product).shouldBe('1 x 2 x 3 x 4')
Test(() => mult({a: 'oo', b: 3}).product).shouldBe('oooooo')
Test(() => mult({a: ['a','b','c'], b: 2}).product).shouldBe('a x b x ca x b x c')

const jsonicDefaults = {method: 'GET'}
const jsonic = monadic({
  inputType: {url: 'string', method: '#?enum "HEAD"|"GET"|"POST"|"PUT"|"DELETE"', requestData: '#?any', config: '#?object'},
  outputType: {data: '#any'},
  func: async (params = jsonicDefaults) => {
    const {url, method, requestData, config} = Object.assign({}, params, jsonicDefaults)
    return { data: await b8r.json(url, method, requestData, config ) }
  }
})
Test(() => jsonic).shouldShareConstructor(async () => {})
Test(() => jsonic({url: 'documentation.json'}).then(({data}) => data.length)).shouldBe(9)
~~~~
*/

import { deepClone } from './b8r.iterators.js'
import { isAsync, describeType, matchType } from './b8r.byExample.js'

const monadicArgs = Object.freeze({
  defaultInput: {},
  inputType: {},
  outputType: {},
  func: obj => obj
})
export function monadic (config = monadicArgs, ...extraArgs) {
  if (config === monadicArgs) {
    return new Error('monadic was called with no arguments')
  }
  let { defaultInput, inputType, outputType, func } = Object.assign({}, monadicArgs, config)
  if (defaultInput && !Object.keys(inputType).length) {
    inputType = deepClone(defaultInput)
  }
  if (config instanceof Error) {
    return config
  } else if (
    !inputType || !outputType ||
    typeof inputType !== 'object' || typeof outputType !== 'object' ||
    typeof func !== 'function'
  ) {
    console.error('monadic received', config)
    return new Error('monadic should be passed {defaultInput: {}, inputType: {}, outputType:{}, func(){}}')
  } else if (extraArgs.length) {
    return new Error('monadic received more than one argument')
  }
  const monad = isAsync(func)
    ? async (input = {}, ...extraArgs) => {
      input = await input
      if (input instanceof Error) {
        return Error
      }
      input = Object.assign({}, defaultInput, input)
      if (extraArgs.length) {
        return new Error('monad received more than one argument')
      } else if (!input || typeof input !== 'object') {
        return new Error('monad non-object argument')
      }
      if (inputType) {
        const inputErrors = matchType(inputType, input)
        if (inputErrors.length) {
          const errorString = 'input error: ' + inputErrors.join(', ')
          console.error(errorString)
          return new Error(errorString)
        }
      }
      const output = await func(Object.assign(
        {},
        defaultInput,
        input
      ))
      if (outputType) {
        const outputErrors = matchType(outputType, output)
        if (outputErrors.length) {
          const errorString = 'output error: ' + outputErrors.join(', ')
          console.error(errorString)
          return new Error(errorString)
        }
      }
      return output
    }
    : (input, ...extraArgs) => {
      if (input instanceof Error) {
        return Error
      }
      input = Object.assign({}, defaultInput, input)
      if (extraArgs.length) {
        return new Error('monad received more than one argument')
      } else if (!input || typeof input !== 'object') {
        return new Error('monad non-object argument')
      }
      if (inputType) {
        const inputErrors = matchType(inputType, input)
        if (inputErrors.length) {
          return new Error('input error: ' + inputErrors.join(', '))
        }
      }
      const output = func(input)
      if (outputType) {
        const outputErrors = matchType(outputType, output)
        if (outputErrors.length) {
          return new Error('output error: ' + outputErrors.join(', '))
        }
      }
      return output
    }

  monad.type = {
    isAsync,
    inputType: describeType(inputType),
    outputType: describeType(outputType),
    description: `${isAsync ? 'async ' : ''}` +
      `(${JSON.stringify(describeType(inputType), false, 2)}) => ` +
      `${JSON.stringify(describeType(outputType), false, 2)}`
  }

  return monad
}
