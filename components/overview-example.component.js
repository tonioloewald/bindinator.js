export default {
  view: ({div, input, button, p}) => [
    div(
      input({ bindValue: '_component_.name' }),
      button( 'Click Me', { onClick: '_component_.actions.click'} )
    ),
    p()
  ],
  initialValue: ({ get, findOne }) => ({
    name: 'Juanita',
    actions: {
      click: () => {
        findOne('p').textContent = `It works, ${get().name}!`
      }
    }
  })
}
