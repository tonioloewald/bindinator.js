/**
# Markdown Components

Provides a simple `<b8r-markdown>` control that displays rendered
markdown passed as its `value`.

```
    <b8r-markdown data-bind="value=_component_.markdown"></b8r-markdown>
    <script>
      set('markdown', '###markdown\n**bold** and _italic');
      require('web-components/markdown.js');
    </script>
```
*/

const {md} = require('../lib/text-render.js');

const {
  makeElement,
  makeWebComponent,
} = require('../lib/web-components.js');

const MarkdownArea = makeWebComponent('b8r-markdown', {
  value: true,
  style: {
    ':host': {
      display: 'block',
    },
  },
  methods: {
    render() {
      md(this, this.value);
    },
  },
  ariaRole: 'rich text',
});

module.exports = {
  MarkdownArea,
}