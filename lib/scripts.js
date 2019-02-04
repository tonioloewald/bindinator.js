/**
# scripts

    import {viaTag} from 'path/to/scrips.js';
    viaTag('path/to/library.js'); // inserts a (singleton) script tag

If (as is typical) the script creates a global that you want to reference
then you can write:

    import {viaTag} from 'path/to/scrips.js';
    const {THREE} await viaTag('path/to/three.min.js');

To simplify this, you can pass the name of the global symbol as an extra
parameter:

`viaTag` returns a promise that resolves when the tag has loaded.
*/

const scriptTags = {}

export const viaTag = (script_path) => {
  if (!scriptTags[script_path]) {
    scriptTags[script_path] = new Promise((resolve) => {
      const script = document.createElement('script')
      script.setAttribute('src', script_path)
      script.addEventListener('load', () => resolve(window))
      document.body.appendChild(script)
    }).catch(() => console.error(`${script_path} failed to load`))
  }
  return scriptTags[script_path]
}
