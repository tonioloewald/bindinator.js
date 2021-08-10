/**
# html-render

This is a tool for nicely rendering HTML, and in particular for nicely rendering
the HTML in `b8r` component (dehydrated) views.

```
<style>
  ._component_ {
    display: flex;
    flex-direction: column;
    position: relative;
  }
  ._component_ b8r-code-editor {
    flex: 1 1 auto;
    width: 100%;
    margin: 5px 0;
  }

  ._component_ h3 {
    margin: 0;
  }

  ._component_ .bar {
    flex: 0 0 auto;
    display: flex;
  }

  ._component_ .bar > input {
    flex: 1 1 auto;
  }

  ._component_ .bar > *+* {
    margin-left: 5px;
  }
</style>
<h3 data-bind="text=_component_.title"></h3>
<b8r-code-editor mode="html"></b8r-code-editor>
<div class="bar">
  <input data-bind="value=_component_.component">
  <button data-event="click:_component_.innerHTML">innerHTML</button>
  <button data-event="click:_component_.n2t">node2Text</button>
</div>
<script>
  import('../web-components/code-editor.js').then(() => {
    const textarea = findOne('b8r-code-editor')
    data.component = 'fiddle'

    data.innerHTML = async () => {
      const {view} = await b8r.component(get().component)
      textarea.value = view.innerHTML
      set({title: `view.innerHTML of ${get('component')} component`})
    }

    data.n2t = async () => {
      const {childNodes2Text} = await import('../lib/html-render.js')
      const {view} = await b8r.component(get().component)
      textarea.value = childNodes2Text(view)
      set({title: `childNodes2Text(view) of ${get('component')} component`})
    }

    data.n2t()
  })
</script>
```

## Features

Sorts attributes of elements into alphabetical order, with the special exception that
`data-list`, `data-bind`, and `data-event` are sorted to the top AND in that order
(i.e. `data-list` first) because `data-bind` and `data-event` are resolved "within"
a list-instance.

In simple terms, it converts HTML that looks like this:

    <div class="list-item" data-event="click:foo.bar; mousedown:foo.baz" data-list="path.to.items:id">
      <input title="some field" class="some-field" data-bind="value=foo.color;attr(placeholder)=foo.ph">
    </div>

Into something like this:

    <div
        data-list="path.to.items:id"
        data-event="
          click:foo.bar
          mousedown:foo.baz
        "
        class="list-item"
    >
      <input
          data-bind="
            value=foo.color
            attr(placeholder)=foo.ph
          "
          class="some-field"
          title="some field"
      >
    </div>

## Useful Exports

    EMPTY_ELEMENTS // a list of empty element tagNames
    BINDING_ATTRIBUTES} // a list of b8r's binding attributes (data-list, etc.)
    spaces(n) // returns a string of 2n spaces
    node2Text(node, indent) // renders a node as indented text
      //  handles Text and Comment nodes
      //  Comment nodes will not be indented

## Exported mainly for testing

    attrs2Lines(attributes, indent) // converts an array of attribute key/value pairs
      // into a set of indented lines, splitting binding attributes across multiple
      // lines where appropriate
    tag2Lines(tag, indent) // converts the start of a tag to an array of indented lines of text
      // splitting attributes across lines where warranted
    node2Lines(node, indent) // converts node to an array of indented lines of text

*/

/* global Text Comment */
export const EMPTY_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']

export const BINDING_ATTRIBUTES = ['data-list', 'data-bind', 'data-event']

function sortAttributes (a, b) {
  if (BINDING_ATTRIBUTES.includes(a)) {
    if (BINDING_ATTRIBUTES.includes(b)) {
      return BINDING_ATTRIBUTES.indexOf(a) - BINDING_ATTRIBUTES.indexOf(b)
    }
    return -1
  } else if (BINDING_ATTRIBUTES.includes(b)) {
    return 1
  }
  return a > b ? 1 : a === b ? 0 : -1
}

const _spaces = ['']
export function spaces (indent) {
  if (typeof _spaces[indent] !== 'string') {
    _spaces[indent] = spaces(Math.floor(indent / 2)) +
      spaces(Math.floor(indent / 2)) +
      (indent % 2 ? '  ' : '')
  }
  return _spaces[indent]
}

export function attrs2Lines (attributes /* [{key, value}] */, indent = 0) {
  return attributes.map(({ key, value }) => {
    if ((BINDING_ATTRIBUTES.includes(key) && value.includes(';')) || value.includes('\n')) {
      value = value.split(/[\n;]/).map(line => line.trim()).filter(line => !!line)
      return [
        `${spaces(indent)}${key}="`,
        ...value.map(line => `${spaces(indent + 1)}${line}`),
        `${spaces(indent)}"`
      ]
    } else {
      return `${spaces(indent)}${key}="${value}"`
    }
  }).flat()
}

export function tag2Lines (elt, indent = 0) {
  const tagName = elt.tagName.toLocaleLowerCase()
  const attributes = elt.getAttributeNames().sort(sortAttributes).map(key => ({
    key,
    value: elt.getAttribute(key)
  }))
  const attributeText = attributes.length
    ? ' ' + attributes
      .map(({ key, value }) => `${key}="${value}"`)
      .join(' ')
    : ''
  const onlySimpleAttributes = !attributes.find(({ key }) => BINDING_ATTRIBUTES.includes(key))
  if (onlySimpleAttributes) {
    const singleLine = `${spaces(indent)}<${tagName}${attributeText}>`
    if (
      (
        attributes.length < 3 &&
          singleLine.length <= 80 &&
          !attributes.includes('\n')
      ) || attributes.length === 0
    ) {
      return [singleLine]
    }
  }
  return [
    `${spaces(indent)}<${tagName}`,
    ...attrs2Lines(attributes, indent + 2),
    `${spaces(indent)}>`
  ]
}

const div = document.createElement('div')
export function node2Lines (node, indent = 0) {
  if (node instanceof Text) {
    div.textContent = ''
    div.append(node.cloneNode(true))
    return div.innerHTML.trim()
      .split('\n')
      .filter(s => !!s.trim())
      .map(s => spaces(indent) + s)
  }
  if (node instanceof Comment) {
    return [`<!-- ${node.textContent.trim()} -->`]
  }
  const tagName = node.tagName.toLowerCase()
  const tagLines = tag2Lines(node, indent)
  if (EMPTY_ELEMENTS.includes(tagName)) {
    return tagLines
  }
  const childNodes = [...node.childNodes].filter(node => !(node instanceof Text) || node.textContent)
  if (childNodes.length === 0 && tagLines.length === 1 && tagLines[0].length + tagName.length < 77) {
    return [`${tagLines[0]}</${tagName}>`]
  }
  const childLines = childNodes.map(c => node2Lines(c, indent + 1))
  if (tagLines.length > 1 && childLines.length === 0) {
    tagLines[tagLines.length - 1] += `</${tagName}>`
    return tagLines
  }
  return [
    ...tagLines,
    ...childLines,

    spaces(indent) + `</${tagName}>`
  ].flat()
}

export function node2Text (node, indent = 0) {
  return node2Lines(node, indent).join('\n')
}

export function childNodes2Text (node, indent = 0) {
  return [...node.childNodes].filter(child => !(child instanceof Text) || child.textContent.trim()).map(child => node2Text(child, indent)).join('\n')
}
