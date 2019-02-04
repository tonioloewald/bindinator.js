/**
# Make Stylesheet

Usage:

    import makeStyleSheet from 'path/to/makeStylesheet.js';
    makeStylesheet('h1 { font-size: 100px; }', 'my style sheet');

Inserts the source in a `<style>` tag and sticks in in the document head. It will have the
supplied title as its `data-title` attribute;

    import {viaLink} from 'path/to/makeStyleSheet.js';
    viaLink('path/to/styles.css'); // returns a <link> tag with appropriate href

Adds:

    <link rel="stylesheet" type="text/css" href="path/to/styles.css">

to the document header if (and only if) no such tag is already present (it only checks for
`<link>` tags with the same href, so if you're doing something *really weird* with links this
might lead to problems.)
*/

import { create, text, findOne } from './b8r.dom.js'

const makeStyleSheet = (source, title) => {
  const style = source ? create('style') : false
  if (style) {
    style.type = 'text/css'
    style.dataset.title = title
    style.appendChild(text(source))
    document.head.appendChild(style)
  }
  return style
}

export const viaLink = (href) => {
  if (!findOne(`link[href="${href}"]`)) {
    const link = create('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = href
    document.head.append(link)
  }
}

export default makeStyleSheet
