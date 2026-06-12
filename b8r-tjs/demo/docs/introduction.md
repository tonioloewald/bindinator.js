# b8r-tjs

**b8r-tjs** runs legacy **b8r** markup and modern **b8r components** on the
**tosijs** engine. Bindings are *wiring* (not "view = f(state)"), components are
*redefinable definitions* (so they hot-reload), and the whole stack is literate
and runtime-type-safe.

This very page is a `tosijs-ui` doc-browser. The example below is a **b8r
component** — an ESM-style `{ css, view, initialValue }` object — mounted into the
live preview by the b8r-tjs blueprint loader. Open the code (the `</>` button) and
edit it: it re-mounts as you type.

```js
import { makeComponent } from 'b8r-tjs'

const counter = makeComponent({
  // `css` can be a function of tosijs's css-variable proxies (like `view` is a
  // function of `elements`); `varDefault.gap('12px')` → `var(--gap, 12px)`.
  css: ({ varDefault }) =>
    '._component_ { font-size: 1.4rem; display: flex; gap: ' + varDefault.gap('12px') + '; align-items: center }' +
    '._component_ button { font: inherit; padding: 4px 12px; cursor: pointer }',
  view: ({ div, button, span }) => div(
    span({ class: 'n', bindText: 'count: ${_component_.count}' }),
    button('+1', { class: 'inc', onClick: '_component_.inc' }),
    button('reset', { class: 'reset', onClick: '_component_.reset' })
  ),
  initialValue: ({ component }) => ({
    count: 0,
    inc: () => { component.data.count = component.data.count + 1 },
    reset: () => { component.data.count = 0 }
  })
})
preview.append(counter())
```

`makeComponent` is imported from `b8r-tjs` — in the docs that import resolves to
`b8rExampleContext`, spread into the doc-browser's `context`. That single context
spread is the only wiring needed to make b8r fiddles work alongside tosijs ones.
