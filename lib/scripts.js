/**
# scripts

    import {viaTag} from 'path/to/scrips.js';

    viaTag('path/to/library.js'); // inserts a (singleton) script tag

`viaTag` returns a promise that resolves when the tag has loaded.
*/

const scriptTags = {};

export const viaTag = (script_path) => {
  if(!scriptTags[script_path]) {
    scriptTags[script_path] = new Promise((resolve) => {
      const script = document.createElement('script');
      script.setAttribute('src', script_path);
      script.addEventListener('load', resolve);
      document.body.appendChild(script);
    }).catch(() => console.error(`${script_path} failed to load`));
  }
  return scriptTags[script_path];
};
