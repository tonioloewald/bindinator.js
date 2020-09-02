/**
# Scriptlet Editor

<b8r-component path="../components/scriptlet-editor.component.js"></b8r-component>
*/

export default {
  css: `
    ._component_ label,
    ._component_ textarea {
      display: block;
    }

    ._component_ b8r-code-editor {
      min-height: 400px;
      width: 100%;
    }
  `,
  html: `
    <a data-bind="text=scriptlet.name;scriptlet.build=scriptlet.script">bookmark me</a> click to test, or bookmark to make scriptlet
    <label>
      Title <input data-bind="value=scriptlet.name">
    </label>
    <b8r-code-editor data-bind="value=scriptlet.script"></b8r-code-editor>
  `,
  async initialValue ({b8r}) {
    await import('../web-components/code-editor.js');
    
    b8r.register('scriptlet', {
      name: 'alert demo',
      script: 'alert("it works")',
      build (elt, scriptlet) {
        elt.setAttribute('href', 'javascript:(() => {' + escape(scriptlet) + '})()')
      }
    })
    return {}
  },
}