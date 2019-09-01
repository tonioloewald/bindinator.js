## From `require` to `import`

`b8r` has migrated from using `require` to `import`. This is a _breaking change_ but
it had to happen sometime.

- `require` has been abolished in favor of `import`.
- `require.viaTag`, `require.lazy` and misc. support for legacy libraries has been 
  replaced with the much simpler `viaTag` from `scripts.js`.
- The `<script>` tag of components is implemented as an `AsyncFunction`.
- `data-component`  is being phased out in favor of `<b8r-component>`. (instead of
  `<div data-component="foo">...</div>` you can now write 
  `<b8r-component name="foo"></b8r-component>` and in fact you can write
  `<b8r-component path="path/to/foo"></b8r-component>` and the component will automatically
  be loaded)
- extensive support for `web-components` (a.k.a. "Custom Elements") is now available.

If you want to use `b8r` from a `<script>` tag, change it to `<script type="module">`
which will allow you to use `import` in any modern browser (i.e. not IE before Microsoft
gave up and adopted Chromium, and not some other browsers that `b8r` already didn't care
about).

Replace `require` with `import` throughout. Replace `module.exports = ...` with `export`.

You'll probably want this documentation on 
[import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) 
and [export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export).

If you'd prefer a potted summary, read on…

### `import` and `export` in 5 minutes

This is for those of you who don't want to read all the documentation. (I don't blame you.)

`import` (a.k.a. "static import") is used in three ways:

    import foo from './path/to/foo.js';

Takes the `export default` from `foo.js` and assigns it to `const foo`.

    import {baz, lurman} from './path/to/bar.js';

Takes the specific exports from `bar.js` and sticks them in `const baz` and `const lurman`.

    import * as bar from './path/to/bar.js';

Takes all the specific exports from `bar.js` and makes them properties of `const bar = {...}`.

## Export

There are a ton of ways to export stuff from a library, but the ones you really need to
know about are:

    export default foo; // foo is what you'll get by importing the module

And:

    export const foo = 17; // foo is what you'll get by importing {foo} from the module
    export let foo = 17;   // as above, but foo will be a **reference**
    export { foo, ... };        // as above, but what you get depends on what foo is
    export { foo as baz, ... }; // as above, but you're renaming the export

A typical module pattern involves defining a bunch of stuff and then putting something like:

    // foo.js
    const bar = ...
    const baz = ...
    module.exports = {bar, baz}

at the bottom of the file. This can be replaced with:

    // foo.js
    const bar = ...
    const baz = ...
    export {bar, baz}

And then you can use either:

    import {bar} from './path/to/foo.js'

or:

    import * as foo from './path/to/foo.js'

You can also export something you've imported in one step, e.g.

    export {foo, bar} from './path/to/foo.js'
    export {default} from './path/to/something.js'
    export * from './path/to/something-else.js'

## Dynamic Import

Finally, there's **dynamic import**. You can only use `import` within a module context. 
In particular, code loaded at runtime and evaled inside a function is not such a 
context. (In `b8r` this means "component scripts".) Here, you need to use
the dynamic import pseudo-function, which works a bit like `require` but not really.

It works like this:

    const {bar, baz} = await import('./path/to/foo.js');

**Note**: `default` is treated like a named specific symbol in a dynmically imported
module, so if you wanted everything out of `foo.js` inside `const foo` you'd write:

    const foo = (await import('./path/to/foo.js')).default;

### Migrating to `import` by Example

Old way (**no longer works!**):

    <script src="path/to/require.js"></script>
    <script>
      const b8r = require('path/to/b8r.js');
      const foo = require('lib/foo.js');
      const {baz} = require('path/to/lurman.js');
      ...

New Way:

    <script type="module">
      import b8r from './path/to/b8r.js';
      import foo from './lib/foo.js';
      import {baz} from './path/to/lurman.js';
      ...

Note that _all import paths need to be relative_, so `require('foo/bar.js')` becomes
`import('./foo/bar.js')`.

### Modernizing Libraries

In libraries, you'll need to replace `module.exports = foo` with `export`
statements. In general:

    export {foo} // import {foo} from 'path/to/foo.js';

Will prove more workable than:

    export default foo; // import foo from 'path/to/foo.js';

Because:

    const foo = await import 'path/to/foo.js'; // doesn't work?!

does not seem to work.

### Inside Component `<script>` Tags

Component `<script>` tags are inserted into an `AsyncFunction` that fires when a
component is inserted. So you cannot use static `import` inside a component's script
and must use **dynamic** `import(...)`.

So, within components, you'll need to rewrite imports from something like this:

    const foo = require('./path/to/foo.js'); // NO LONGER WORKS!

To something like this:

    const {foo} = await import('../path/to/foo.js');

(**Note**: right now, the import base path will be that of the context 
from which b8r.component was called, rather than the directory the component is in.)

### Legacy Libraries and `viaTag`

`lib/scripts.js` provides a `viaTag` function replaces `require.viaTag` 
and imports libraries as scripts when they do not support modules 
(which is most of them).

E.g. to use `three.js`:

    const {viaTag} = await import('path/to/scripts.js');
    const {THREE} = await viaTag('path/to/three.js'); // viaTag resolves to window

This is clumsy, but the chance that a solid library will cause problems
this way is small, and all your application code will be tucked away in anonymous
closures.

The alternative, of course, is to use libraries that are implemented as ES6 modules
or modify them to do so.