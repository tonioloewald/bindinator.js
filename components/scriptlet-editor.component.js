/**
# Scriptlet Editor

<b8r-component path="../components/scriptlet-editor.component.js"></b8r-component>
*/

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
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      border: 1px solid var(--black-20);
    }

    ._component_ .drag-over {
      background: var(--black-10);
      border-color: var(--black-40);
    }
  `,
  html: `
    <a data-bind="text=scriptlet.name;scriptlet.build=scriptlet.script">bookmark me</a> click to test, or bookmark to make scriptlet
    <div style="padding: 5px 0;">
      <label>
        Title <input data-bind="value=scriptlet.name">
      </label>
      <b8r-dropzone type="text/uri-list">
        Drop scriptlet here to edit it
      </b8r-dropzone>
    </div>
    <b8r-code-editor data-bind="value=scriptlet.script"></b8r-code-editor>
  `,
  async initialValue ({b8r, findOne}) {
    await import('../web-components/code-editor.js');
    await import('../web-components/drag-drop.js');

    findOne('b8r-dropzone').handleDrop = evt => {
      const text = evt.dataTransfer.getData('text/plain')
      if (text.startsWith('javascript:')) {
        b8r.set('scriptlet.script', unescape(text.substr(11)))
      }
      return true
    }
    
    b8r.register('scriptlet', {
      name: 'scriptlet',
      script: 'alert("it works")',
      build (elt, scriptlet) {
        elt.setAttribute('href', 'javascript:' + escape(scriptlet))
      }
    })
    return {}
  },
}