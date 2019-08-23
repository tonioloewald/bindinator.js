/**
# webComponentTest

`webComponentTest` is a simple convenience method for testing that web-components render as expected
to be used in conjunction with b8r's `test.js`.

Usage in `b8r`'s inline tests:
    
    const {webComponentTest} = await import('../web-components/web-component-test.js')
    webComponentTest(Test, '../web-components/bindery.js', 'b8r-bindery')

Usage from scratch:

    import {configuredTest} from 'path/to/test.js'
    import {webComponentTest} from 'path/to/web-component-test.js'
    const test = configuredTest(...)
    webComponentTest(test, '../web-components/bindery.js', 'b8r-bindery')

> **Note**: this file is currently skipped by StandardJS because dynamic imports currently
> break the ESLint parser. (Dyanmic `import()` is only at Stage 3 of standardization.)

Here's an inline test verifying that the `select.js` components render as expected:
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/select.js', 'b8r-select-bar', 'b8r-select', 'b8r-option')
~~~~
*/

import {Test} from '../lib/test.js'

export const webComponentTest = (test, source, ...tags) => {
  import(source).then(() => {
    tags.forEach(tag => {
      const div = document.createElement('div')
      div.innerHTML = `<${tag}></${tag}}`
      const elt = div.children[0]
      const _test = test(
        () => elt.constructor.name,
        `verify <${tag}> renders`
      )
      if (! _test instanceof Test) throw new Error('expect test to be instance of Test')
      _test.shouldNotBe('HTMLElement')
    })
  })
}