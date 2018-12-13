const {
  fragment,
  makeElement,
  makeWebComponent,
} = require('../lib/web-components.js');

makeWebComponent('select-option', {
  value: {writeable: false},
  style: {
    ':host': {
      display: 'inline-block',
      padding: '3px 8px',
      height: '100%',
      margin: 0,
      borderRadius: '2px',
    },
  },
  eventHandlers: {
    mouseup(evt) {
      this.parentElement.value = this.value;
    },
  },
  ariaRole: 'select',
});

makeWebComponent('select-bar', {
  value: {
    writeable: true
  },
  attributes: {
    background: '#ddd',
    color: 'black',
    selectedBackground: 'white',
    selectedColor: 'blue',
    transition: '0.125s ease-out',
  },
  style: {
    ':host': {
      display: 'inline-flex',
      font: '14px Helvetica, Sans-serif',
      alignItems: 'stretch',
      borderRadius: '99px',
      overflow: 'hidden',
      cursor: 'default',
      userSelect: 'none',
      position: 'relative',
      border: '1px solid transparent',
    }
  },
  methods: {
    render(){
      thistabIndex = 0;
      this.style.background = this.background;
      this.style.borderColor = this.background;
      const options = [...this.children].filter(x => x.tagName === 'SELECT-OPTION');
      options.forEach((option, idx) => {
        option.style.transition = this.transition;
        option.style.color = option.value == this.value ? this.selectedColor : this.color;
        option.style.background = option.value == this.value ? this.selectedBackground : '';
      });
    },
  },
  ariaRole: 'select',
});

makeWebComponent('select-pop', {
  value: {
    writeable: true
  },
  attributes: {
    background: '#ddd',
    color: 'black',
    selectedBackground: 'white',
    selectedColor: 'blue',
    transition: '0.125s ease-out',
    open: false,
    width: '100px',
  },
  style: {
    ':host': {
      display: 'inline-flex',
      position: 'relative',
      cursor: 'default',
      borderRadius: '3px',
      border: '1px solid transparent',
    },
    '.selection': {
      display: 'inline-flex',
      position: 'relative',
      flexGrow: '1',
      overflow: 'hidden',
    },
    '.selection > *': {
      flexGrow: '1',
    },
    '.indicator': {
      padding: '0 4px',
    },
    '.menu': {
      position: 'absolute',
      top: '22px',
      left: '-1px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      font: '14px Helvetica, Sans-serif',
      alignItems: 'stretch',
      borderRadius: '2px',
      overflow: 'hidden',
      userSelect: 'none',
      border: '1px solid transparent',
    },
  },
  eventHandlers: {
    mouseenter(evt) {
      if (evt.target === this) this.open = true;
    },
    mouseleave(evt) {
      if (evt.target === this) this.open = false;
    },
    mouseup(evt) {
      requestAnimationFrame(() => this.open = !this.open);
    }
  },
  methods: {
    render(){
      thistabIndex = 0;
      const selection = this.shadowRoot.querySelector('.selection');
      selection.innerHTML = [];
      selection.style.width = this.width;
      this.style.background = this.background;
      this.style.borderColor = this.background;
      const options = [...this.children].filter(x => x.tagName === 'SELECT-OPTION');
      const menu = this.shadowRoot.querySelector('.menu');
      menu.style.display = this.open ? '' : 'none';
      menu.style.background = this.background;
      menu.style.width = this.width;
      options.forEach((option, idx) => {
        const selected = option.value == this.value;
        option.style.transition = this.transition;
        option.style.color = selected ? this.selectedColor : this.color;
        option.style.background = selected ? this.selectedBackground : '';
        if (selected) selection.appendChild(option.cloneNode(true));
      });
    },
  },
  content: fragment(
    makeElement('div', {classes: ['selection']}),
    makeElement('div', {content: '▾', classes: ['indicator']}), 
    makeElement('div', {classes: ['menu'], content: makeElement('slot', {})}),
  ),
  ariaRole: 'select',
});