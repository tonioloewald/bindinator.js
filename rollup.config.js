export default [
  {
    input: 'source/b8r.js',
    output: {
      file: 'dist/b8r.js',
      format: 'cjs'
    }
  },
  {
    input: 'source/b8r.js',
    output: {
      file: 'dist/b8r.mjs',
      format: 'esm'
    }
  },
  {
    input: 'source/b8r.js',
    output: {
      name: 'b8r',
      file: 'dist/b8r.iife.js',
      format: 'iife'
    }
  }
]
