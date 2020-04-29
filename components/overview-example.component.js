export default {
  html: `
    <div>
      <input data-bind="value=_component_.name">
      <button data-event="click:_component_.actions.click">
        Click Me
      </button>
    </div>
    <p></p>
  `,
  initialValue: ({ get, findOne }) => ({
    name: 'Juanita',
    actions: {
      click: () => {
        findOne('p').textContent = `It works, ${get().name}!`
      }
    }
  })
}
