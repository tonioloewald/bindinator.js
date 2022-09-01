/**
# elements

A convenient factory for creating DOM elements in code.

    elements('tag-name', 'text', {sack: 'of attributes'}, element) // creates a <tag-name> element

`elements` is actually a proxy and will automatically create factories for specific element types, e.g.

    elements.div({class: 'bar'}, 'foo') // create <div class="bar">foo</div>

Or even:

    const {template, div, label, input} = elements

    const myTemplate = template(
      div(
        label(
          'this is a field',
          input({bindValue: 'app.doc.field1'})
        ),
        label(
          'this is another field',
          input({bindValue: 'app.doc.field2'})
        ),
        button(
          'Make it so!',
          onClick: 'app.controller.doSubmit'
        )
      )
    )

`elements._comp` creates a `<b8r-component>` element, e.g.:

    elements._comp({
      path: '../components/foo.js'
    })

Produces:

    <b8r-component path="../components/foo.js"></b8r-component>

Attributes beginning with `bind` will be converted into data-bindings, while those beginning with
`on` will be converted into event bindings, e.g.

    elements.button(
      'Click Me!',
      bindEnabledIf: 'app.enableButton',
      bindShowIf: 'app.showButton',
      onClick: 'app.doThing',
    )

Produces:

    <button
        data-bind="
          enabledIf=app.enableButton
          showIf=app.showButton
        "
        data-event="click:app.doThing"
    >Click Me!</button>
*/

/* global HTMLElement */

const makeElement = (tagType, ...contents) => {
  const elt = document.createElement(tagType)
  for (const item of contents) {
    if (item instanceof HTMLElement || typeof item === 'string') {
      elt.append(item)
    } else {
      const dataBindings = []
      const eventBindings = []
      for (const key of Object.keys(item)) {
        const value = item[key]
        if (key === 'bindList') {
          elt.dataset.list = value
        } else if (key.includes('.')) {
          dataBindings.push(`${key}=${value}`)
        } else if (key.match(/^(bind|on)[A-Z]\w+$/)) {
          if (key.startsWith('bind')) {
            dataBindings.push(`${key.substr(4).replace(/[A-Z]/, c => c.toLowerCase())}=${value}`)
          } else {
            eventBindings.push(`${key.substr(2).replace(/[A-Z]/, c => c.toLowerCase())}:${value}`)
          }
        } else {
          elt.setAttribute(key, value)
        }
      }
      if (dataBindings.length) {
        elt.dataset.bind = dataBindings.join('\n')
      }
      if (eventBindings.length) {
        elt.dataset.event = eventBindings.join('\n')
      }
    }
  }
  return elt
}

const _comp = (...contents) => makeElement('b8r-component', ...contents)

export const elements = new Proxy({ _comp }, {
  get (target, tagName) {
    if (!tagName.match(/^\w+(-\w+)*$/)) {
      throw new Error(`${tagName} does not appear to be a valid element tagName`)
    } else if (!target[tagName]) {
      target[tagName] = (...contents) => makeElement(tagName, ...contents)
    }
    return target[tagName]
  },
  set () {
    throw new Error('You may not add new properties to elements')
  }
})
