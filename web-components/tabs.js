/**
# tabs

A simple tab component. It shows one of its children at a time and 
makes one tab based on the `name` attribute of each child.

The value of the tab component is the index of the currently visible
body.

## TODO

Implement <tab-body> and <tab-button> to allow fine-grained styling 
and rich content in tabs, and assignment of specific values to tabs
(versus indices).

```
    <tab-selector>
      <div name="first" style="padding: 20px">first tab content</div>
      <div name="second" style="padding: 20px">second tab content</div>
    </tab-selector>
    <script>
      require('web-components/tabs.js');
    </script>
```
*/
const {
  fragment,
  div,
  span,
  slot,
  makeWebComponent,
} = require('../lib/web-components.js');

const TabSelector = makeWebComponent('tab-selector', {
  value: true,
  style: {
    ':host': {
      display: 'block',
    },
    slot: {
      position: 'relative',
      display: 'block',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '2px',
    },
    '.tabs': {
      borderColor: '#ccc',
      padding: '5px 5px 0 5px',
      display: 'flex',
    },
    '.tabs > span': {
      flex: '1 1 auto',
      whitespace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      background: '#ddd',
      padding: '5px 10px',
      borderRadius: '5px 5px 0 0',
      border: '1px solid #ccc',
      borderBottom: '1px solid transparent',
      cursor: 'default',
      margin: '-1px',
    },
    '.tabs > .selected': {
      background: 'white',
      zIndex: '2',
      border: '1px solid #ccc',
      borderBottom: '1px solid white',
      transform: 'translateY(1px)'
    },
  },
  eventHandlers: {
    childListChange() {
      this.render();
    }
  },
  methods: {
    render() {
      const value = this.value || 0;
      const tabs = this.shadowRoot.querySelector('.tabs');
      // note that this is explicitly supporting b8r list bindings, but should cause no problems
      // for vanilla js
      const bodies = [...this.children].filter(body => !body.dataset.list);
      [...tabs.children].forEach(tab => bodies.find(body => body._tab === tab) || tab.remove());
      bodies.forEach((body, idx) => {
              if (! body._tab) {
                const tab = span({
                  attributes: {tabIndex: 0},
                  content: body.getAttribute('name') || 'untitled',
                });
                tab.addEventListener('mouseup', () => {
                  this.value = idx;
                  tab.focus();
                });
                tab._body = body;
                body._tab = tab;
              }
              body.style.display = idx === value ? '' : 'none';
              body._tab.classList.toggle('selected', idx === value);
              tabs.appendChild(body._tab);
            });
    },
  },
  content: fragment(
    div({classes: ['tabs']}),
    slot(),
  ),
  ariaRole: 'rich text',
});

module.exports = {
  TabSelector,
}