/**
# Code Editor

A simple code editor which uses ace

    <b8r-code-editor mode="javascript" value="// code goes here"></b8r-code-editor>

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

const makeCodeEditor = async (codeElement, mode = 'html') => {
  const { viaTag } = await import('../lib/scripts.js')
  const { ace } = await viaTag('https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.min.js')
  ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/')
  const editor = ace.edit(codeElement, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false
  })
  editor.setTheme('ace/theme/monokai')
  return editor
}

export const codeEditor = makeWebComponent('b8r-code-editor', {
  attributes: {
    value: '',
    mode: 'javascript',
    pendingChange: 0
  },
  style: {
    ':host': {
      display: 'block',
      position: 'relative'
    }
  },
  eventHandlers: {
    input () {
      if (this.pendingChange === 0) {
        this.pendingChange = setTimeout(() => {
          this._editor.then(editor => {
            this.value = editor.getValue()
          })
          this.pendingChange = 0
        }, 500)
      }
    },
    resize () {
      if (this._editor) {
        this._editor.then(editor => editor.resize(true))
      }
    }
  },
  methods: {
    connectedCallback () {
      this._editor = makeCodeEditor(this, this.mode)
      if (!this.value) {
        this.value = this.textContent.trim()
      }
    },
    render () {
      // this._editor will be empty if element created but not connected
      if (!this._editor) {
        return
      }
      // note that there is a race condition if the user types something and while
      // the change is pending the value of the element is set programmatically
      this._editor.then(editor => {
        if (this.pendingChange === 0 && editor.getValue() !== this.value) {
          editor.setValue(this.value, 1)
        }
      })
    }
  },
  role: 'code editor'
})
