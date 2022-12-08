/**
# To Do (simple)

This is a minimalist "to do" example specifically designed for comparison to the [ReactJS](https://reactjs.org)
example. In particular it uses fewer lines of code, doesn't require transpilation, and updates the DOM more
efficiently (try turning on paint-flashing).

It's discussed more fully in [React vs. b8r](/?source=docs/react.md).

<b8r-component style="padding: 20px; display: block;" path="../components/todo-simple.js"></b8r-component>
*/

export default {
  view: ({ h3, ol, li, input, button }) => [
    h3('To Do List'),
    ol(li({ dataList: '_component_.todos', bindText: '.text' })),
    input({ placeholder: 'enter reminder', bindValue: '_component_.text', 'onKeydown(Enter)': '_component_.add' }),
    button('Add to List', { onClick: '_component_.add', bindEnabledIf: '_component_.text', bindText: 'Add #{{_component_.nextItem}}' })
  ],
  initialValue: ({ component }) => ({
    todos: [],
    text: '',
    nextItem: 1, // just here to match the React example
    add: () => {
      const { text, todos } = component.data
      if (text) {
        todos.push({ text })
        component.data.text = ''
        component.data.nextItem += 1
      }
    }
  })
}
