const {
  makeElement,
  makeWebComponent,
} = require('../lib/web-components.js');

makeWebComponent('checkbox-switch', {
  value: {
    writeable: true
  },
  attributes: {
    color: '#ccc',
    onColor: '#0f0',
    transition: '0.125s ease-out',
    thumbColor: '#eee',
    width: '36px',
    height: '16px',
    thumbSize: '24px',
  },
  style: {
    ':host': {
      position: 'relative',
      display: 'inline-block',
      borderRadius: '99px',
      cursor: 'default',
    },
    '.thumb': {
      position: 'absolute',
      display: 'block',
      borderRadius: '99px',
    },
  },
  content: makeElement('span', {classes: ['thumb']}),
  eventHandlers: {
    mouseup(evt) {
      this.value = !this.value;
    },
    keydown(evt) {
      evt.preventDefault();
    },
    keyup(evt) {
      if (evt.code === 'Space') this.value = !this.value;
      evt.preventDefault();
    }
  },
  methods: {
    render() {
      this.tabIndex = 0;
      const thumb = this.shadowRoot.querySelector('.thumb');
      thumb.style.transition = this.transition;
      thumb.style.background = this.thumbColor;
      thumb.style.width = this.thumbSize;
      thumb.style.height = this.thumbSize;
      const height = parseFloat(this.height);
      const thumbSize = parseFloat(this.thumbSize);
      const inset = (height - thumbSize) * 0.5;
      thumb.style.top = `${inset}px`;
      thumb.style.left = this.value ? `${this.offsetWidth - inset - thumbSize}px` : `${inset}px`;
      this.style.margin = `${-inset}px`;
      this.style.background = this.value ? this.onColor : this.color,
      this.style.width = this.width;
      this.style.height = this.height;
      this.style.transition = this.transition;
    },
  },
});