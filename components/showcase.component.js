/**
# Showcase
## Component Examples, Demos, and Tests

This component is designed to showcase and test components. It works best with
the new javascript components.

Usage:

    <b8r-component
      path="path/to/component-test.component.js"
      data-module="./path/to/foo.component.js"
    ></b8r-component>

## Configuration

If a javascript component module exports a `configuration` array, `component-test`
will provide a configuration panel for interactively modifying the displayed component.

The configuration object looks like this:

    export const configuration = {
      {
        name: 'size',
        values: [
          { description: 'small', value: 'small' },
          { description: 'normal', value: 'normal' },
          ...
        ]
      },
      {
        name: 'animation',
        values: [
          { description: 'animated', value: true },
          { description: 'no animation', value: false },
          ...
        ]
      },
      ...
    }

## Examples

If a javascript component module exports an `examples` array, `component-test`
will allow the user to see the different examples (all at once or one-at-a-time).

The examples array looks like this:

    export const examples = [
      {
        name: 'default',
        skipSnapshot: true,
      },
      {
        name: 'no animation',
        settings: [
          { name: 'animation', option: false },
          ...
        ]
      },
    ]

Within an example `skipSnapshot` blocks snapshot testing for a given example. In
this case we're assuming that the component is normally *animated* and snapshot
testing will be highly prone to fail.

(If no `examples` array is exported, `component-test` will simply display the component
in its default state.)

Each example provided (or just the default state) will be **snapshot-tested**.

## Snapshot Tests
### (NOT IMPLEMENTED)

`component-test` performs snapshot testing when you run the `b8r` project on
`localhost` using the provided dev server (`server.js`).

A snapshot test comprises rendering the component in a given state with `puppeteer`
and comparing the result to a saved "golden" snapshot. If the results don't match
(or if there's no result) the problem will be flagged and you can opt to update
the "golden" snapshot, skip snapshot testing for that particular configuration,
or fix your code.

### Dark Mode vs. Light Mode

On macOS, the snapshot tests will test both "light" and "dark" modes.

## a11y Tests
### (NOT IMPLEMENTED)

`component-test` performs `ally` testing using [aXe](https://github.com/dequelabs/axe-core)
on each example and interactively displays any issues it discovers.

Your module can export an `a11yException` object to selectively suppress a11y errors.

You can examine a list of accessibility issues and mark those you wish to ignore
for the component as a whole or any specific case, and you will be provided with
an `a11yExceptions` object to add to your component source file.

`component-test` will flag if you are passing tests you have opted to ignore (so it
will not progression as well as regression).

## Web Components
### (NOT IMPLEMENTED)

## Legacy Components

For old HTML components, `component-test` will simply display the component
in its default state.

You can specify a helper javascript module using the `data-helper` attribute,
which will attempt to load `configuration`, `examples`, and `a11yExceptions`.

In order to derive the most benefit from component-test
*/
export default {

}
