## From `require` to `import`

`b8r` has migrated from using `require` to `import`. This is a _breaking change_ but
it had to happen sometime.

- `require` has been abolished in favor of `import`.
- `require.lazy` and misc. support for legacy libraries has been replaced with
  the much simpler `viaTag` from `scripts.js`.
- The `<script>` tag of components is implemented as an `AsyncFunction`.
- `data-component`  is being phased out in favor of `<bar-component>`.
- extensive support for `web-components` (a.k.a. "Custom Elements") is now available.

If you want to use `b8r` from a `<script>` tag, change it to `<script type="module">`
which will allow you to use `import` in any modern browser (i.e. not IE before Microsoft
gave up and adopted Chromium, and not some other browsers that `b8r` already didn't care
about).

Replace `require` with `import` throughout. Replace `module.exports = ...` with `export`.
You'll probably want this documentation on 
[import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) 
and [export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export).

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

Within components, you'll need to rewrite imports from something like this:

    const foo = require('./path/to/foo.js'); // NO LONGER WORKS!

To something like this:

    const {foo} = await import('../path/to/foo.js');

(**Note**: right now, the import base path will be that of the context 
from which b8r.component was called, rather than the directory the component is in.)

In libraries, you'll need to replace `module.exports = foo` with `export`
statements. In general:

    export {foo} // import {foo} from 'path/to/foo.js';

Will prove more workable than:

    export default foo; // import foo from 'path/to/foo.js';

Because:

    const foo = await import 'path/to/foo.js'; // doesn't work?!

does not seem to work.

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