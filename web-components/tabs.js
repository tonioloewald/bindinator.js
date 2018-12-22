/**
# tabs

A simple tab component. It shows one of its children at a time and 
makes one tab based on the `name` attribute of each child.

The value of the tab component is the index of the currently visible
body.
*/
const {
  fragment,
  makeElement,
  makeWebComponent,
} = require('../lib/web-components.js');

const TabSelector = makeWebComponent('tab-selector', {
  value: true,
  style: {
    ':host': {
      display: 'block',
    },
    slot: {
      display: 'block',
      padding: '10px',
      background: 'white',
      border: '5px solid #ccc',
      borderTop: 0,
    },
    '.tabs': {
      borderColor: '#ccc',
      padding: '5px 5px 0 5px',
      background: '#ccc',
      display: 'flex',
    },
    '.tabs > span': {
      flex: '1 1',
      whitespace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      background: '#eee',
      padding: '5px 10px',
      borderRadius: '10px 10px 0 0',
      cursor: 'default',
    },
    '.tabs > .selected': {
      background: 'white',
      zIndex: '2',
    },
  },
  methods: {
    render() {
      const value = this.value || 0;
      const tabs = this.shadowRoot.querySelector('.tabs');
      const bodies = [...this.children];
      [...tabs.children].forEach(tab => bodies.find(body => body._tab === tab) || tab.remove());
      bodies.forEach((body, idx) => {
              body.style.display = idx === value ? 'block' : 'none';
              if (! body._tab) {
                const tab = makeElement('span', {
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
              body._tab.classList.toggle('selected', idx === value);
              tabs.appendChild(body._tab);
            });
    },
  },
  content: fragment(
    makeElement('div', {classes: ['tabs']}),
    makeElement('slot', {}),
  ),
  ariaRole: 'rich text',
});

module.exports = {
  TabSelector,
}