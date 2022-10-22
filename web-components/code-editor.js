/**
# Code Editor

Embed a code editor anywhere using a simple web-component that embeds [Ace](https://ace.c9.io/).

    <b8r-code-editor
      mode="javascript"
      options='{"showGutter": false}'
      value="// code goes here"
    ></b8r-code-editor>

The `options` attribute allows greater customization using arbitrary JSON.

By default, the code editor will load the text within the tag, treating it as pre-formatted.

```
<b8r-code-editor mode="javascript" style="width: 100%; height: 200px;">
// code goes here

console.log('hello world')
</b8r-code-editor>
```
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/code-editor.js', 'b8r-code-editor')
~~~~
*/

import { makeWebComponent } from '../source/web-components.js'

const makeCodeEditor = async (codeElement, mode = 'html', options = {}) => {
  const { viaTag } = await import('../lib/scripts.js')
  const { ace } = await viaTag('https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.13/ace.min.js')
  ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.13/')
  const editor = ace.edit(codeElement, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
    ...options
  })
  editor.setTheme('ace/theme/monokai')
  return editor
}

export const codeEditor = makeWebComponent('b8r-code-editor', {
  attributes: {
    mode: 'javascript',
    options: '',
    disabled: false
  },
  props: {
    value (source) {
      if (source) {
        if (this._syncEditor) {
          this._syncEditor.setValue(source || '', 1)
        } else {
          this._value = source
        }
      } else {
        return this._syncEditor ? this._syncEditor.getValue() : this._value || null
      }
    }
  },
  style: {
    ':host': {
      display: 'block',
      position: 'relative'
    }
  },
  eventHandlers: {
    resize () {
      if (this._editor) {
        this.ready().then(editor => editor.resize(true))
      }
    }
  },
  methods: {
    ready () {
      const options = {
        showGutter: !this.disabled,
        ...JSON.parse(this.options || '{}')
      }
      if (!this._editor) {
        this._editor = makeCodeEditor(this, this.mode, options)
        this._editor.then(editor => {
          this._syncEditor = editor
          if (this._value) {
            this._syncEditor.setValue(this._value, 1)
            delete this._value
          }
        })
      }
      return this._editor
    },
    connectedCallback () {
      this.ready().then(editor => editor.setReadOnly(this.disabled))
      if (!this.value) {
        this.value = this.textContent.trim('\n')
      }
    },
    render () {
      // this._editor will be empty if element created but not connected
      if (!this._editor) {
        return
      }
      // note that there is a race condition if the user types something and while
      // the change is pending the value of the element is set programmatically
      this.ready().then(editor => {
        if (editor.getValue() !== this.value) {
          editor.setValue(this.value || '', 1)
        }
        editor.setReadOnly(this.disabled)
      })
    }
  },
  role: 'code editor'
})
