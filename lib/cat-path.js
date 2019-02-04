/**
# catPath

    const path = catPath('file://path', '/to/', '../target');

Concatenate paths (generally assumed to be urls).

~~~~
const {catPath} = await import('../lib/cat-path.js');
Test(() => catPath('file://path/', '/to/data/')).shouldBe('file://path/to/data/');
Test(() => catPath('file://path/', '/to/data/', '../foo')).shouldBe('file://path/to/foo');
Test(() => catPath('file://path/to/data/', '../../foo')).shouldBe('file://path/foo');
~~~~
*/
/* global module */

export const catPath = (...args) => {
  let path = args.join('/')
  // clean up doubled /s
  path = path.replace(/([^:/])\/{2,}/g, '$1/')
  // resolve ..
  while (path.indexOf('../') > 2) {
    path = path.replace(/\/[^/]+\/\.\.\//g, '/')
  }
  return path
}

export default catPath
