/**
# Markdown Components

Provides a simple `<markdown-area>` control that displays rendered
markdown passed as its `value`.

```
    <markdown-area data-bind="value=_component_.markdown"></markdown-area>
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

const MarkdownArea = makeWebComponent('markdown-area', {
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