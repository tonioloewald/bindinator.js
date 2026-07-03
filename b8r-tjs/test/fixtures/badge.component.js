// fixture: a modern b8r component module, loaded via <b8r-component path="…">
export default {
  view: ({ b }) => b({ class: 'badge', bindText: '_component_.label' }),
  initialValue: { label: 'imported' }
}
