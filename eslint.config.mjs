import js from '@eslint/js'
import globals from 'globals'

// Replaces the old .eslintrc.js (dead format in eslint 9+) and `standard`.
// Formatting lives in prettier (.prettierrc.json, shared with tosijs); this
// config is only about catching real problems.
export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // b8r is browser-first, but utils/ and the dev server are node, and
      // component `load` bodies reference b8r-injected globals via
      // `/* global ... */` comments.
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Files carry `/* global console, requestAnimationFrame */` comments
      // from the pre-flat-config era, which now duplicate globals.browser /
      // globals.node. Those aren't redeclarations worth reporting; real
      // shadowing of a user binding still is.
      'no-redeclare': ['error', { builtinGlobals: false }],
      // leading-underscore convention for intentionally unused bindings,
      // matching tosijs.
      //
      // `args: 'none'` is a b8r-specific departure: components receive a
      // fixed destructured signature (`load({component, b8r, data, get, set,
      // on, find, findOne, touch, register})`) and most use only a few of
      // them. A destructured property can't take an `_` prefix without
      // aliasing it, so flagging these would mean either noise or 50-odd
      // pointless `b8r: _b8r` renames.
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Rules eslint 9/10 added that `standard` 14 never ran. They flag real
      // (minor) issues in existing code — warn so they're visible without
      // blocking the build, pending triage.
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
  {
    ignores: [
      'dist/',
      'third-party/',
      'icomoon/',
      // separate subproject, own toolchain
      'b8r-tjs/',
      'test/',
      'node_modules/',
    ],
  },
]
