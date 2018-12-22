/**
# Markdown Components

Provides a simple `<mardown-area>` control that displays rendered
markdown passed as its value.
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