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

then a b8r fiddle's **js** is a one-liner that mounts a component spec into the
preview (no `export default`, since the pane runs as a function body):

    renderB8rExample(preview, {
      css: '._component_ button { font: inherit }',
      view: ({ div, button, span }) => div(
        span({ bindText: '${_component_.count}' }),
        button('+1', { onClick: '_component_.inc' })
      ),
      initialValue: ({ component }) => ({
        count: 0, inc: () => { component.data.count = component.data.count + 1 }
      })
    })

The same spec works whether imported from a `.component.js` module or typed live
in the editor — that's "use the loader when needed": tosijs examples run as before,
b8r examples call `renderB8rExample` (or import the loader from `'b8r-tjs'`).
*/

import { defineB8rComponent, loadB8rComponent, mountB8rComponent } from './b8r-blueprint.js'
import { hydrateB8r } from './b8r-compat.js'

let exampleSeq = 0

// Render a modern b8r component `spec` (`{ css, html|view, load, initialValue }`)
// into `target` — typically a live-example `preview`. Each call registers a fresh
// redefinable definition (the preview is rebuilt on every edit, so a new
// definition per render is correct and keeps edits isolated). Returns the mount id.
export function renderB8rExample (target, spec, name) {
  const componentName = name === undefined ? 'live-example-' + (exampleSeq++) : name
  const entry = defineB8rComponent(componentName, spec)
  return entry.mount(target)
}

// A context fragment to spread into a `<live-example>`'s `context`. Exposes the
// blueprint loader both as a namespace (so a fiddle can
// `import { renderB8rExample } from 'b8r-tjs'`) and as bare helpers (usable with
// no import, since live-example injects every context key as a local).
export const b8rExampleContext = {
  'b8r-tjs': { defineB8rComponent, loadB8rComponent, mountB8rComponent, hydrateB8r, renderB8rExample },
  renderB8rExample
}
