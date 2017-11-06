/**
# catPath

    const path = catPath('file://path', '/to/', '..)

Concatenate paths (generally assumed to be urls).

~~~~
const catPath = _required_;
Test(() => catPath('file://path/', '/to/data/')).shouldBe('file://path/to/data/');
Test(() => catPath('file://path/', '/to/data/', '../foo')).shouldBe('file://path/to/foo');
Test(() => catPath('file://path/to/data/', '../../foo')).shouldBe('file://path/foo');
~~~~
*/

module.exports = (...args) => {
  let path = args.join('/');
  // clean up doubled /s
  path = path.replace(/([^:\/])\/{2,}/g, '$1/');
  // resolve ..
  while(path.indexOf('../') > 2) {
    path = path.replace(/\/[^\/]+\/\.\.\//g, '/');
  }
  return path;
}