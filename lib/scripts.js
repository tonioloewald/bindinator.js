/**
# scripts

    import {viaTag} from 'path/to/scripts.js';
    viaTag('path/to/library.js'); // inserts a (singleton) script tag

If (as is typical) the script creates a global that you want to reference
then you can write:

    import {viaTag} from 'path/to/scripts.js';
    const {THREE} await viaTag('path/to/three.min.js');

To simplify this, you can pass the name of the global symbol as an extra
parameter:

`viaTag` returns a promise that resolves when the tag has loaded.
*/

const scriptTags = {}

export const viaTag = (scriptPath) => {
  if (!scriptTags[scriptPath]) {
    scriptTags[scriptPath] = new Promise((resolve) => {
      const script = document.createElement('script')
      script.setAttribute('src', scriptPath)
      script.addEventListener('load', () => resolve(window))
      document.body.appendChild(script)
    }).catch(() => console.error(`${scriptPath} failed to load`))
  }
  return scriptTags[scriptPath]
}
