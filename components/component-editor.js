/**
# Component Editor

<b8r-component path="../components/component-editor.js"></b8r-component>
*/

import '../web-components/code-editor.js'
import '../web-components/tabs.js'

export default {
  css: `
    ._component_ {
      display: block;
      background: var(--black-10);
      max-height: 100vh;
      max-width: 100vw;
    }
    ._component_ .view,
    ._component_ b8r-code-editor {
      height: 100%;
    }

    ._component_ .bodies {
      display: flex;
      flex-direction: row; 
      min-height: 400px;
      position: relative;
    }

    ._component_ .bodies > * {
      position: relative;
      min-width: 20%;
      flex: 1 1 auto;
    }

    ._component_ .view {
      width: 50%;
    }

    ._component_ b8r-tab-selector {
      width: 50%;
    }
  `,
  view ({ _comp, li, span, ul, div, input, b8rTabSelector, b8rCodeEditor }) {
    return [
      _comp(
        { path: '../components/menubar.js' },
        li(
          span({ class: 'icon-home' }),
          ul(
            li('About the Component Editor', { onMenuclick: '_component_.about' })
          )
        ),
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
          li('Reload', { dataShortcut: 'ctrl-R', onMenuclick: '_component_.reload' }),
          li({ class: 'separator' }),
          li('Toggle Views', { dataShortcut: 'ctrl-T', onMenuclick: '_component_.toggleCodeViews' }),
          li({ class: 'separator' }),
          li('Layout', { dataShortcut: 'ctrl-1', onMenuclick: '_component_.showTab', dataCommand: 0 }),
          li('Styles', { dataShortcut: 'ctrl-2', onMenuclick: '_component_.showTab', dataCommand: 1 }),
          li('Code', { dataShortcut: 'ctrl-3', onMenuclick: '_component_.showTab', dataCommand: 2 }),
          li('Preview', { dataShortcut: 'ctrl-4', onMenuclick: '_component_.showTab', dataCommand: 3 }),
          li('State', { dataShortcut: 'ctrl-5', onMenuclick: '_component_.showTab', dataCommand: 4 })
        )),
        li('Help', ul(
          li(
            input({
              class: 'menu-search',
              onMousenter: '_component_.focusSearch',
              type: 'search',
              placeholder: 'Search menus'
            })
          )
        ))
      ),
      div(
        { class: 'bodies' },
        _comp({ class: 'view' }),
        _comp({ path: '../components/sizer' }),
        b8rTabSelector(
          b8rCodeEditor({ name: 'docs', mode: 'markdown', bindValue: '_component_.docs' }),
          b8rCodeEditor({ name: 'css', mode: 'css', bindValue: '_component_.css' }),
          b8rCodeEditor({ name: 'html', mode: 'html', bindValue: '_component_.html' }),
          b8rCodeEditor({ name: 'code', node: 'javascript', bindValue: '_component_.js' }),
          b8rCodeEditor({ name: 'state', node: 'javascript', bindValue: '_component_.state' })
        )
      )
    ]
  },
  async initialValue ({ b8r, component, findOne, find, set }) {
    await import('../vfs.js')
    await Promise.all(find('b0r-code-editor').map(editor => editor.ready))
    const { id } = await import('../source/uuid.js')
    const vfsRoot = window.location.hostname === 'tonioloewald.github.io' ? 'bindinator.js/vfs' : 'vfs'
    const view = findOne('.view')
    const tabSelector = findOne('b8r-tab-selector')

    return {
      docs: '# Untitled',
      css: `._component_ { color: var(--accent-color); }
`,
      html: '<div>hello <span data-bind="text=_component_.who"></span></div>',
      js: `export default {
  async initialValue({component}) { return { who: 'world' } },

  async load({component}) {}
}
`,
      state: '{}',
      about () {
        window.alert('Rapid app development like it’s the 90s!')
        return true
      },
      showTab (evt) {
        tabSelector.value = evt.target.dataset.command
        return true
      },
      showState () {
        if (tabSelector.value === 4) {

        }
      },
      toggleCodeViews () {
        if (tabSelector.style.display === 'none') {
          tabSelector.style.display = ''
          view.style.display = 'none'
        } else if (view.style.display === 'none') {
          view.style.display = ''
        } else {
          tabSelector.style.display = 'none'
        }
        return true
      },
      focusSearch () {
        findOne('.menu-search').focus()
      },
      loadSource (source, type = 'auto') {
        if (type === 'auto') {
          type = source.match(/^\s*</) ? 'html' : 'js'
        }
        if (type === 'js') {

        } else {
          // adapted from b8r.makeComponent but actually more robust!
          let parts; let remains; let docs = 'untitled'; let css = '/* no styles found */'; let html = ''; let js = 'export default {}'

          parts = source.split(/-->/)
          if (parts.length === 2) {
            [docs, remains] = parts
          }
          docs = docs.split(/<!--/)[1]

          parts = remains.split(/<style>|<\/style>/).map(s => s.replace(/^\n+|\n+$/, ''))
          if (parts.length === 3) {
            [, css, remains] = parts
          }

          parts = remains.split(/<script[^>\n]*>|<\/script>/)
          if (parts.length >= 3) {
            [html, js] = parts
            html = html.trim('\n')

            const funcs = ['component', 'b8r', 'find', 'findOne', 'data', 'register', 'get', 'set', 'on', 'touch'].filter(func => js.includes(func))
            js = js.replace(/'use strict';?\n|"use strict";?\n/g, '').trim('\n')
            // TODO set up warnings, e.g. for register
            js = `export default {
  async load({${funcs.join(', ')}}) {
    ${js.split('\n').map(line => `      ${line}`).join('\n')}
  }
}`
          } else {
            html = remains.trim('\n')
          }

          // extract docs
          if (docs) {
            docs = docs.replace(/<!--/, '')
            docs = docs.replace(/-->/, '')
            docs = docs.trim('\n')
          } else {
            docs = '# untitled'
          }

          // rewrite inline template variables to be safer
          html = html.replace(/\$\{([^}]+)\}/g, '{{$1}}')

          set({ docs, css, html, js })
          console.log('setting', { docs, css, html, js })
          component.data.reload()
        }
      },
      getSource () {
        let { docs, css, html, js } = component.data
        js = `/**\n${docs}\n*/\n\n` + js.replace(/\bexport default {/,
`export default {
  css: \`${css}\`,\n
  html: \`${html}\`,\n`)
        return js
      },
      async reload () {
        const js = component.data.getSource()
        const cid = `ce-${id()}`
        const vfsPath = `/${vfsRoot}/${cid}.js`
        await b8r.ajax(vfsPath, 'POST', js)
        import(vfsPath).then(exports => {
          b8r.makeComponent(cid, exports.default)
          view.empty()
          view.name = cid
        })
      }
    }
  }
}
