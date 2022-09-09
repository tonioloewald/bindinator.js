/**
# Markdown Components

Provides a simple `<b8r-markdown>` control that displays rendered
markdown passed as its `value`.

```
<b8r-markdown data-bind="value=_component_.markdown"></b8r-markdown>
<script>
  await import('../web-components/markdown.js');
  set('markdown', '###markdown\n**bold** and _italic');
</script>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/markdown.js', 'b8r-markdown')
~~~~
*/

import { md } from '../lib/text-render.js'

import {
  makeWebComponent
} from '../source/web-components.js'

export const MarkdownArea = makeWebComponent('b8r-markdown', {
  attributes: {
    value: ''
  },
  style: {
    ':host': {
      display: 'block'
    }
  },
  methods: {
    render () {
      md({ elt: this, source: this.value })
    }
  },
  role: 'rich text'
})
