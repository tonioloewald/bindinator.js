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
