# TODO(me)

## Goals
- to be able to create layouts either directly from designer-tools (e.g. figma, Sketch)
  or via a decent user interface, or (preferably) leverage an existing component
- to be able to work on a front-end project directly from the browser
  - support code quality tools as much as possible (standardjs, linthtml, csslint, diff, etc)
    even if it only works from localhost / electron app.
  - load project directly from github / bitbucket (GitHub.js doesn't seem like it can do forks or pull requests)
  - open and edit a component, and see change in real time
  - save changes to dev-server
  - save changes as a pull-request to github / bitbucket
  - add support to test.js for simulated user-actions (clicking and text-entry at least)
  - on-the-fly screen-diffing (visual golden testing)
  - demo/test harness for viewing/testing/debugging use-cases and server-side golden testing

## Short-Term To Do List
- fiddle lets you create new templates
- fiddle should recognize custom-elements
- better component editor
  - easily load existing components, from internal list, url, file
  - save components to server, file, window, 
  - support for new javascript components
  - support for custom-elements
    - allow user to write `html` for the element's content and convert it to code on-the-fly
      - check the html on-the-fly (e.g. by parsing it and round-tripping)
        - is there a good tool for detecting non-whitespace differences in two strings in browser?
      - consider allowing template strings in the template -- wait for an actual use-case
        - and flag it "once" or "dynamic"
- add more features to `<b8r-component>` as make sense
- add legacy flag for converted components to allow them to receive "data"
