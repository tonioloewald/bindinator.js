/**
# Component Editor

<b8r-component path="../components/component-editor.js"></b8r-component>
*/

import '../web-components/code-editor.js'
import '../web-components/tabs.js'

export default {
  css: `
    ._component_ .view,
    ._component_ b8r-code-editor {
      height: 100%;
    }

    ._component_ .view {
      width: 50%;
    }

    ._component_ b8r-tab-selector {
      width: 50%;
    }
  `,
  view ({ _comp, li, ul, div, dialog, header, b8rTabSelector, b8rCodeEditor }) {
    console.log(_comp)
    return [
      _comp(
        { path: '../components/menubar.js' },
        li('File', ul(
          li('New', { dataShortcut: 'ctrl-N' }),
          li('Open…', { dataShortcut: 'ctrl-O' }),
          li('Save', { dataShortcut: 'ctrl-S' }),
          li('Save As…', { dataShortcut: 'ctrl-shift-S' }),
          li('Close', { dataShortcut: 'ctrl-W' })
        )),
        li('Edit', ul(
          li('Undo', { dataShortcut: 'ctrl-Z' }),
          li({ class: 'separator' }),
          li('Cut', { dataShortcut: 'ctrl-X' }),
          li('Copy', { dataShortcut: 'ctrl-C' }),
          li('Paste', { dataShortcut: 'ctrl-V' })
        )),
        li('View', ul(
          li('Layout', { dataShortcut: 'F1' }),
          li('Styles', { dataShortcut: 'F2' }),
          li('Code', { dataShortcut: 'F3' }),
          li('Preview', { dataShortcut: 'F4' })
        ))
      ),
      div(
        { style: 'display: flex; flex-direction: row; min-height: 400px; position: relative;' },
        div({ class: 'view' }),
        _comp({ path: '../components/sizer' }),
        b8rTabSelector(
          b8rCodeEditor({ name: 'style', mode: 'css' }),
          b8rCodeEditor({ name: 'view', mode: 'html' }),
          b8rCodeEditor({ name: 'initialValue', node: 'javascript' }),
          b8rCodeEditor({ name: 'load', node: 'javascript' })
        )
      )
    ]
  },
  initialValue () {

  }
}
