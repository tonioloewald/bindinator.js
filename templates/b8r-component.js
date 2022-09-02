/**
# b8r-component template

<b8r-component name="fiddle" data-source="./templates/b8r-component.js"></b8r-component>
*/

export default {
  css: `
    ._component_ button {
      border: 1px solid green;
    }
  `,
  view: ({button, span}) => [
    button(
      { onClick: '_component_.edit' },
      span({ class: 'icon-home5' }, ' '),
      span({ bindText: '_component_.caption'}),
    ),
  ],
  // construct initialValue before element is inserted into component
  initialValue: async ({ b8r, get, set }) => {
    return {
      edit () {
        /* global prompt */
        const caption = prompt('edit caption', get().caption)
        if (typeof caption === 'string') {
          set({ caption })
        }
      }
    }
  },
  load: async ({
    component, // this is the element that the component is inserted into
    b8r, // it's b8r!
    find, // b8r.findWithin(component, ...)
    findOne, // b8r.findOneWithin(component, ...)
    register, // replace the component's private data object
    get, // get (within the component's private data)
    set, // set (within the component's private data)
    on, // b8r.on(component, ...)
    touch // force updates of paths inside the component
  }) => {
    // your javascript goes here
  },
  type: {
    caption: 'click me'
  } // specify the component's type
}
