# b8r Components on tosijs

Legacy b8r binding features all hydrate onto tosijs: `data-list`, two-way
`value`, a two-way `checked`, key-qualified events (`keyup(Enter)` — `keyup`, not
`keydown`, so the handler runs after the field's `change`; see the note below),
parameterised targets (`class(done)`), and `${path}` string interpolation. Here's
a to-do component that uses every one of them:

```js
import { makeComponent } from 'b8r-tjs'

const todo = makeComponent({
  css: '._component_ { display: block; font-family: system-ui, sans-serif; max-width: 24rem }' +
       '._component_ ul { list-style: none; padding: 0; margin: 0 0 .75rem }' +
       '._component_ li { padding: 6px 2px; border-bottom: 1px solid #eee }' +
       '._component_ .done { text-decoration: line-through; color: #999 }' +
       '._component_ .row { display: flex; gap: 8px }' +
       '._component_ input[type=text] { flex: 1; padding: 6px 8px }',
  view: ({ div, h3, ul, li, input, label, span, button }) => div(
    h3({ bindText: '${_component_.title} — next #${_component_.nextId}' }),
    ul(li({ dataList: '_component_.todos:id' },
      label(
        input({ type: 'checkbox', bindChecked: '.done' }),
        span({ 'bindClass(done)': '.done', bindText: '.text' })
      )
    )),
    div({ class: 'row' },
      input({ type: 'text', placeholder: 'new reminder', bindValue: '_component_.text', 'onKeyup(Enter)': '_component_.add' }),
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
})
preview.append(todo())
```

The list rows bind item-relative paths (`text=.text`, `checked=.done`,
`class(done)=.done`); the header interpolates two `_component_` paths and
re-renders when either changes; the input is two-way and `Add` is disabled while
it's empty.

## A note on `keyup` vs `keydown`

The reminder field commits on **`keyup`**, not `keydown`. b8r updated its model
synchronously; b8r-tjs adopts **tosijs's asynchronous update model** (a better
design) and does *not* emulate the old synchronous behaviour. Because of that, a
`keydown` handler fires *before* the field's `change` event — so a handler that
mutates the bound value (like clearing the input after adding) can read a stale
value or have its write reverted by that `change`. `keyup` fires *after* `change`,
so it just works. The adapter logs a deprecation warning if it sees a `keydown`
(or `keypress`) handler on a two-way-bound field, recommending `keyup`.
