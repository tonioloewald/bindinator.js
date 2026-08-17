/*#
## b8r-tjs · b8r compatibility barrel

The b8r-on-tosijs surface in one import — the modern component loader, the
b8r→tosijs binding adapter, and the ported element creator:

    import { defineB8rComponent, hydrateB8r, elements } from 'b8r-tjs/b8r'

This barrel is deliberately **tosijs-only and side-effect-free**. Three related
modules are *not* re-exported here, each for a reason:

- `b8r-tjs/component` (legacy `.component.html` loader) registers a loader hook
  **at import time**, which is how `<b8r-component path="components/hello">`
  starts resolving extensionless paths. Importing it is the opt-in, so pulling
  it into a barrel would hand that behaviour to everyone.
- `b8r-tjs/targets-extra` is opt-in by design so the extra binding targets only
  get bundled when asked for (`registerExtraB8rTargets()`).
- `b8r-tjs/example` pulls the tosijs-ui `<live-example>` bridge, which only the
  docs site wants.

`b8r-tjs/compile`, `/live` and `/untrusted` pull `tjs-lang` (and the AJS VM) and
are kept behind their own subpaths so nothing here drags them in.
*/

export {
  defineB8rComponent,
  loadB8rComponent,
  mountB8rComponent,
  defineExternalComponent,
  hydrateB8rComponents,
  makeComponent,
  setComponentPathBase,
  setLegacyComponentLoader,
} from './b8r-blueprint.js'

export {
  hydrateB8r,
  bindElement,
  registerB8rBindings,
  getListInstance,
} from './b8r-compat.js'

export { elements, create } from './b8r-elements.js'
