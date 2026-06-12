/*#
# To Do — a modern b8r component (ESM-object form)

A `view`-builder component (no HTML/CSS slabs): the view is a function of the
`elements` creator, state + methods come from `initialValue`, and bindings use
b8r's `_component_` scope. Loaded onto tosijs by the b8r-tjs blueprint loader.
*/
export default {
  css: `
    ._component_ { display: block; font-family: system-ui, sans-serif; max-width: 24rem; }
    ._component_ h3 { margin: 0 0 .5rem; }
    ._component_ ul { list-style: none; padding: 0; margin: 0 0 .75rem; }
    ._component_ li { padding: 6px 2px; border-bottom: 1px solid #eee; }
    ._component_ .done { text-decoration: line-through; color: #999; }
    ._component_ .row { display: flex; gap: 8px; }
    ._component_ input[type=text] { flex: 1; padding: 6px 8px; }
    ._component_ button { padding: 6px 12px; }
  `,
  view: ({ div, h3, ul, li, input, label, span, button }) => div(
    h3({ bindText: '${_component_.title} — next #${_component_.nextId}' }),
    ul(li({ dataList: '_component_.todos:id' },
      label(
        input({ type: 'checkbox', bindChecked: '.done' }),
        span({ 'bindClass(done)': '.done', bindText: '.text' })
      )
    )),
    div({ class: 'row' },
      input({ type: 'text', placeholder: 'new reminder', bindValue: '_component_.text', 'onKeydown(Enter)': '_component_.add' }),
      button('Add', { onClick: '_component_.add', bindEnabledIf: '_component_.text' })
    )
  ),
  initialValue: ({ component }) => ({
    title: 'To Do',
    text: '',
    nextId: 1,
    todos: [],
    add: () => {
      const data = component.data
      if (!data.text) return
      data.todos.push({ id: data.nextId, text: data.text, done: false })
      data.nextId = data.nextId + 1
      data.text = ''
    }
  })
}
