## From `require` to `import`

- `require` has been abolished in favor of `import`.
- The `<script>` tag of components is implemented as an `AsyncFunction`.
- `data-component`  is being phased out in favor of `<bar-component>`.
- extensive support for `web-components` (a.k.a. "Custom Elements") is now available.

Within components, you'll need to rewrite imports from something like this:

    const foo = require('./path/to/foo.js');

To something like this:

    const {foo} = await import('../path/to/foo.js');

(Right now, the import base path will be that of the context from which
b8r.component was called, rather than the directory the component is in.)

In libraries, you'll need to replace `module.exports = foo` with `export`
statements. In general:

    export {foo} // import {foo} from 'path/to/foo.js';

Will prove more workable than:

    export default foo; // import foo from 'path/to/foo.js';

Because:

    const foo = await import 'path/to/foo.js'; // doesn't work?!

does not seem to work.

`lib/scripts.js` provides a `viaTag` function which imports libraries
as scripts when they do not support modules (which is most of them).
E.g. to use `three.js`:

    const {viaTag} = await import('path/to/scripts.js');
    await viaTag('path/to/three.js');
    const {THREE} = window;

This is clumsy, but the chance that a solid library will cause problems
this way is small, and all your application code will be tucked away in anonymous
closures.

The alternative, of course, is to use libraries that are implemented as ES6 modules
or modify them to do so.