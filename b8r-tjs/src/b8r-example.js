/*#
## b8r-tjs · live-example ↔ blueprint-loader bridge

Lets tosijs-ui's `<live-example>` (the docs-site fiddle component) render **b8r
components** via the blueprint loader. A `<live-example>` runs its `js` pane as a
function with `preview` (the output element) plus everything on its `context`
object in scope; this module supplies that context.

Wire it up by spreading `b8rExampleContext` into a live-example's `context`:

    import { liveExample } from 'tosijs-ui/dist/live-example'
    import { b8rExampleContext } from 'b8r-tjs/dist/b8r-example.js'
    const example = liveExample({ context: { tosijs, ...b8rExampleContext } })

then a b8r fiddle's **js** reads like real authoring code — `import` the API
(rewritten to the injected `b8r-tjs` namespace) and append a component instance:

    import { makeComponent } from 'b8r-tjs'

    const counter = makeComponent({
      css: '._component_ button { font: inherit }',
      view: ({ div, button, span }) => div(
        span({ bindText: '${_component_.count}' }),
        button('+1', { onClick: '_component_.inc' })
      ),
      initialValue: ({ component }) => ({
        count: 0, inc: () => { component.data.count = component.data.count + 1 }
      })
    })
    preview.append(counter())

`makeComponent(spec)` returns an element creator; the same spec works whether
imported from a `.component.js` module or typed live in the editor. tosijs
examples run unchanged. (`renderB8rExample(target, spec)` is a thin
append-one-instance helper kept for the bridge's own convenience.)
*/

import { defineB8rComponent, loadB8rComponent, mountB8rComponent, makeComponent } from './b8r-blueprint.js'
import { hydrateB8r } from './b8r-compat.js'

// Render a modern b8r component `spec` into `target` — a thin helper over
// `makeComponent` for the common "drop one component into a container" case
// (e.g. a fiddle's `preview`). Prefer `makeComponent` directly in examples — it
// reads like real authoring code: `preview.append(makeComponent(spec)())`.
export function renderB8rExample (target, spec, name) {
  const element = makeComponent(spec, { name })()
  target.append(element)
  return element
}

// A context fragment to spread into a `<live-example>` / doc-browser `context`.
// Exposes the authoring API as a single `b8r-tjs` namespace, so a fiddle writes
// `import { makeComponent } from 'b8r-tjs'` (live-example rewrites that to
// `const { makeComponent } = b8rtjs`). The API is intentionally NOT also injected
// as bare context params — that would collide with the rewritten import (`const`
// vs a parameter of the same name → "already declared").
export const b8rExampleContext = {
  'b8r-tjs': { makeComponent, defineB8rComponent, loadB8rComponent, mountB8rComponent, hydrateB8r, renderB8rExample }
}
