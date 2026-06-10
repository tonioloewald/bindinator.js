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
      // when a legacy (.component.html) component is loaded we render it via
      // the original v1 path instead of the vfs round-trip, so its
      // dependencies (relative imports, sub-components) resolve correctly
      legacy: false,
      url: '',
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
      loadSource (source, type = 'auto', url = '') {
        if (type === 'auto') {
          type = source.match(/^\s*</) ? 'html' : 'js'
        }
        if (type === 'js') {
          // TODO: deconstruct a v2 (pure Javascript) component so it can be
          // edited here. For now just flag it as non-legacy.
          set({ legacy: false, url })
        } else {
          // Parse a legacy `.component.html` into its parts. We keep the
          // `<script>` body verbatim (rather than wrapping it in a v2 `load`)
          // and rebuild/render it via the original v1 component path in
          // reload(), so relative imports and sub-component dependencies
          // resolve exactly as they do on the live site.
          let parts; let remains = source
          let docs = '# untitled'; let css = '/* no styles found */'; let html = ''; let js = ''

          // only the leading <!-- ... --> comment is documentation; matching
          // it explicitly avoids being fooled by a `-->` inside the script
          const docMatch = source.match(/^\s*<!--([\s\S]*?)-->/)
          if (docMatch) {
            docs = docMatch[1]
            remains = source.slice(docMatch[0].length)
          }

          parts = remains.split(/<style>|<\/style>/).map(s => s.replace(/^\n+|\n+$/g, ''))
          if (parts.length === 3) {
            [, css, remains] = parts
          }

          parts = remains.split(/<script[^>\n]*>|<\/script>/)
          if (parts.length >= 3) {
            [html, js] = parts
          } else {
            html = remains
          }

          docs = docs.replace(/^\n+|\n+$/g, '')
          html = html.replace(/^\n+|\n+$/g, '')
          js = js.replace(/^\n+|\n+$/g, '')

          set({ docs, css, html, js, legacy: true, url })
          component.data.reload()
        }
      },
      // Preview an already-loaded v2 (pure Javascript) component. Editing v2
      // components in place is still a TODO, so this just renders it.
      previewComponent (c) {
        set({ legacy: false, url: c.name })
        view.empty()
        view.name = c.name
      },
      getSource () {
        const { docs, css, html, js, legacy } = component.data
        if (legacy) {
          // round-trip back to legacy `.component.html` source
          return `<!--\n${docs}\n-->\n\n<style>\n${css}\n</style>\n${html}\n<script>\n${js}\n</script>\n`
        }
        return `/**\n${docs}\n*/\n\n` + js.replace(/\bexport default {/,
`export default {
  css: \`${css}\`,\n
  html: \`${html}\`,\n`)
      },
      async reload () {
        const source = component.data.getSource()
        const cid = `ce-${id()}`
        if (component.data.legacy) {
          // Render legacy components via the original v1 path (no vfs
          // round-trip), so their dependencies resolve as they did before.
          b8r.makeComponent(cid, source, component.data.url || cid)
          view.empty()
          view.name = cid
          return
        }
        const vfsPath = `/${vfsRoot}/${cid}.js`
        await b8r.ajax(vfsPath, 'POST', source)
        import(vfsPath).then(exports => {
          b8r.makeComponent(cid, exports.default)
          view.empty()
          view.name = cid
        })
      }
    }
  }
}
