/**
# Stylesheets

Two utilities for dynamically adding style sheets to the document head.

Usage:

    import makeStyleSheet from 'path/to/makeStylesheet.js';
    makeStylesheet('h1 { font-size: 100px; }', 'my style sheet');

inserts:

    <style title="my style sheet">
      h1 { font-size: 100px; }
    </style>

in the document `<head>`.

    import {viaLink} from 'path/to/makeStyleSheet.js';
    viaLink('path/to/styles.css'); // inserts a <link> tag with appropriate href

inserts:

    <link rel="stylesheet" type="text/css" href="path/to/styles.css">

in the document <head> if (and only if) no such `<link>` tag is already present (it only checks for
`<link>` tags with the same `href`, so if you're doing something *really weird* with links this
might lead to duplicate links.)
*/

import { create, text, findOne } from './dom.js'

const makeStyleSheet = (source, title) => {
  const style = source ? create('style') : false
  if (style) {
    style.type = 'text/css'
    style.id = title
    style.appendChild(text(source))
    document.head.appendChild(style)
  }
  return style
}

export const viaLink = (href) => {
  return new Promise((resolve, reject) => {
    let link = findOne(`link[href="${href}"]`)
    if (!link) {
      link = create('link')
      link.rel = 'stylesheet'
      link.type = 'text/css'
      link.href = href
      document.head.append(link)
      link.onload = () => resolve(link)
    } else {
      resolve(link)
    }
  })
}

export default makeStyleSheet
