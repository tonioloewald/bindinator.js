/**
# Bookmarklet Editor

A [bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) is a browser bookmark or a link that
contains javascript instead of a URL. A browser will execute a bookmarklet within the current page.
Because it executes in the page's context, it's best that you implement bookmarklets by wrapping
them in an anonymous function, i.e. `(() => { your code here })()`.

Bookmarkets can be powerful debugging aids in a pinch, but they're kind of a pain to create
and edit. In essence you need to create a link that looks like `'javascript:' + escape(code)`.
This component allows you to create and edit them by drag and drop.

This is a simple editor for creating and editing bookmarklets conveniently.

<b8r-component path="../components/bookmarklet-editor.component.js"></b8r-component>
*/

const NAME_REGEX = /^\/\/!(.*)?\n/

export default {
  css: `
    ._component_ textarea {
      display: block;
    }

    ._component_ b8r-code-editor {
      min-height: 400px;
      width: 100%;
    }

    ._component_ b8r-dropzone {
      user-select: none;
      display: block;
      padding: 5px 10px;
      border-radius: 4px;
      border: 1px solid var(--black-20);
    }

    ._component_ .drag-over {
      background: var(--black-10);
      border-color: var(--black-40);
    }
  `,
  view ({ div, a, b8rDropzone, b8rCodeEditor }) {
    const paddingStyle = { style: 'padding: 5px 0' }
    return [
      div(
        paddingStyle,
        'Click ',
        a(
          { class: 'bookmarklet', bindText: '_component_.name' },
          'bookmark me'
        ),
        ' to test, or bookmark (e.g. drag to bookmark bar) to make bookmarklet'
      ),
      div(
        paddingStyle,
        b8rDropzone(
          {
            type: 'text/uri-list',
            onDrop: '_component_.handleDrop'
          },
          'drop a bookmarklet here to edit it (does not work in Safari)'
        )
      ),
      b8rCodeEditor({
        bindValue: '_component_.script',
        onChange: '_component_.build'
      })
    ]
  },
  async initialValue ({ findOne, set, get }) {
    await import('../web-components/code-editor.js')
    await import('../web-components/drag-drop.js')
    const bookmarklet = findOne('.bookmarklet')

    return {
      name: '',
      script: '//!untitled\n(() => {\n  alert("it works")\n})()',
      build () {
        const script = get().script
        const name = (script.match(NAME_REGEX) || [null, 'untitled'])[1]
        set({ name })
        bookmarklet.setAttribute('href', 'javascript:' + escape(script))
      },
      handleDrop (evt) {
        const text = evt.dataTransfer.getData('text/plain')
        if (text.startsWith('javascript:')) {
          const script = unescape(text.substr(11))
          const name = (script.match(NAME_REGEX) || [null, 'untitled'])[1]
          set({ name, script })
        }
      }
    }
  }
}
