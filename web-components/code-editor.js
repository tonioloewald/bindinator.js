/**
# Code Editor

A simple code editor which uses ace

    <b8r-code-editor mode="javascript" value="// code goes here"></b8r-code-editor>

This also works (kind of) bearing in mind that whitespace will disapppear and you
need to insert `<br>` at the end of each line:

    <b8r-code-editor mode="javascript">
      // code goes here
    </b8r-code-editor>

<b8r-code-editor mode="javascript" style="width: 100%; height: 200px;">
  // code goes here<br>
  console.log('hello world')
</b8r-code-editor>

~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/code-editor.js', 'b8r-code-editor')
~~~~
*/

import { makeWebComponent } from '../source/web-components.js'

const make_code_editor = async (code_elt, mode = 'html') => {
  const {viaTag} = await import('../lib/scripts.js')
  const {ace} = await viaTag('../third-party/ace-src-min-noconflict/ace.js')
  const editor = ace.edit(code_elt, {
    mode: `ace/mode/${mode}`,
    tabSize: 2,
    useSoftTabs: true,
    useWorker: false,
  })
  ace.config.set('basePath', '../third-party/ace-src-min-noconflict/')
  editor.setTheme('ace/theme/monokai')
  return editor
}

export const codeEditor = makeWebComponent ('b8r-code-editor', {
  attributes: {
    value: '',
    mode: 'javascript',
    pendingChange: 0,
  },
  style: {
    ':host': {
      display: 'block',
      position: 'relative',
    },
  },
  eventHandlers: {
    input () {
      if(this.pendingChange === 0) {
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
      this._editor = make_code_editor(this, this.mode)
      if(!this.value) {
        this.value = this.innerText
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
        if(this.pendingChange === 0 && editor.getValue() !== this.value) {
          editor.setValue(this.value, 1)
        }
      })
    },
  },
  role: 'code editor'
})