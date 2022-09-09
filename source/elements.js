/**
# elements

A convenient factory for creating DOM elements in code. This library comprises the
`create()` function and the `elements` proxy.

    create(tagName, string | object | HTMLElement,… ) // creates the element
    element.div( string | object | HTMLElement,… )    // creates a div

Strings are added to the created element as `Text` nodes, HTMLElements are
appended, and objects are treated as "sacks of attributes" with some convenients.

Inside objects, certain properties get special treatment:

- `camelCaseAttributes` are converted to `kebab-case`, so `dataFooBar` becomes `data-foo-bar`.
- `onEvent` is turned into an event-binding, so {onClick: 'foo.bar`} becomes `data-event="click:foo.bar`
- `bindTarget` is turned into a data-binding, so {bindValue: 'app.text'} becomes `data-bind="value=app.text"`
- attributes containing a period are turned into method-bindings, so {'app.process': 'app.data'} becomes
  `data-bind="app.process=app.data`
- `style` can be a string, e.g. `{style: 'font-size: 14px'}`, or maps, e.g. `{style: {fontSize: '14px'}}`.

Note that parameters are processed in order so for example
`...{style: {fontSize: '14px'}}, {style: 'color: red'}...` will lead to the first style being overwritten.

`elements` will automatically creates and memoizes curried wrappers for `create()` for specific element types, e.g.

    elements.foo(x, y, z) // is equivalent to create('foo', x, ,y, z)

This is all designed to make creating DOM elements more concise and efficient 
than writing HTML or JSX. Examples:

    const {ul, li} = elements
    const list = [ lots, of, stuff ]
    const myList = ul(list.map(li))

    const {table, tr, th, td} = elements
    const list = [ lots, of, objects ]
    const columns = Object.keys(list[0])
    const myTable = table(
      tr(...columns.map(th)),
      list.map(row => tr(...columns.map(key => td(row[key]))))
    )

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

Or consider:

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

Attributes containing a period will be converted into **method bindings**, e.g.

    elements.textarea({
      '_component_.stringify': '_component_.data'
    })

Produces

    <textarea data-bind="_component_.stringify=_component_.data"></textarea>

~~~~
const {elements} = await import('../source/elements.js')
const {div, span, _comp, fooBarBaz, button} = elements

Test(
  () => div().tagName, 'elements.div works'
).shouldBe('DIV')
Test(
  () => _comp().tagName, '_comp produces <b8r-component>'
).shouldBe('B8R-COMPONENT')
Test(
  () => fooBarBaz().tagName,
  'camelCase produces hyphen-case tags'
).shouldBe('FOO-BAR-BAZ')
Test(
  () => div({style: 'color: red'}).style.color,
  'style strings work'
).shouldBe('red')
Test(
  () => div({style: {color: 'green'}}, {style: {fontSize: '24px'}}).getAttribute('style'),
  'style objects work'
).shouldBe('color: green; font-size: 24px;')
Test(
  () => div(span(), span()).children.length,
  'element nesting works'
).shouldBe(2)
Test(
  () => div('foo').childNodes[0].constructor,
  'strings become text nodes'
).shouldBe(Text)
Test(
  () => div({class: 'foo'}).classList.contains('foo'), 
  'class attribute works'
).shouldBe(true)
Test(
  () => button('click me', {onClick: 'foo.bar'}).dataset.event,
  'onEvent produces data-event attribute'
).shouldBe('click:foo.bar')
Test(
  () => button('click me', {bindText: 'foo.bar'}).dataset.bind,
  'bindTarget produces data-bind attribute'
).shouldBe('text=foo.bar')
Test(
  () => div({dataFooBarBaz: 'Lurman'}).getAttribute('data-foo-bar-baz'),
  'camelCase attributes are converted to hyphen-case'
).shouldBe('Lurman')
Test(
  () => div({'foo.bar': 'baz.lurman'}).dataset.bind,
  'implicit method-bindings work'
).shouldBe('foo.bar=baz.lurman')
~~~~
*/

/* global HTMLElement */

export const create = (tagType, ...contents) => {
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
        } else if (key.match(/^(bind|on)[A-Z]/)) {
          /*
  TODO: consider tracking targets and values so that
    bindFoo: 'path.to.thing',
    bindBar: 'path.to.thing'
  becomes:
    'foo,bar=path.to.thing'
  (and similarly for events)
*/
          if (key.startsWith('bind')) {
            dataBindings.push(`${key.substr(4).replace(/[A-Z]/, c => c.toLowerCase())}=${value}`)
          } else {
            eventBindings.push(`${key.substr(2).replace(/[A-Z]/, c => c.toLowerCase())}:${value}`)
          }
        } else if (key === 'style') {
          if (typeof value === 'object') {
            for(const prop of Object.keys(value)) {
              elt.style[prop] = value[prop]
            }
          } else {
            elt.setAttribute('style', value)
          }
        } else {
          elt.setAttribute(key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value)
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

const _comp = (...contents) => create('b8r-component', ...contents)

const _fragment = (...contents) => {
  const frag = document.createDocumentFragment()
  for (const item of contents) {
    frag.append(item)
  }
  return frag
}

export const elements = new Proxy({ _comp, _fragment }, {
  get (target, tagName) {
    tagName = tagName.replace(/[A-Z]/g, c => `-${c.toLocaleLowerCase()}`)
    if (!tagName.match(/^\w+(-\w+)*$/)) {
      throw new Error(`${tagName} does not appear to be a valid element tagName`)
    } else if (!target[tagName]) {
      target[tagName] = (...contents) => create(tagName, ...contents)
    }
    return target[tagName]
  },
  set () {
    throw new Error('You may not add new properties to elements')
  }
})
