const style = document.createElement('style');
style.textContent = `
  :host {
    display: inline-block;
    width: 28px;
    height: 14px;
    margin: 2px 0 0;
    border-radius: 99px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
    cursor: default;
  }

  .thumb {
    content: ' ';
    display: inline-block;
    width: 14px;
    height: 14px;
    margin: -1px;
    border: 1px solid #ddd;
    background: #eee;
    border-radius: 99px;
    box-shadow:
      0 1px 2px rgba(0,0,0,0.5),
      inset 0 -1px 1px rgba(0,0,0,0.125);
  }

  .thumb.on {
    margin-left: 12px;
  }
`;

const div = document.createElement('div');
div.innerHTML = `<span class="thumb"></span>`;

const dom = div.children[0];

class SlideToggle extends HTMLElement {
  constructor () {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    shadow.appendChild(style.cloneNode(true));
    this.thumb = dom.cloneNode(true);
    shadow.appendChild(this.thumb);
    this.addEventListener('mouseup', this.mouseup.bind(this));
    this.addEventListener('keyup', this.keyup.bind(this));

    this.tabIndex = 0;
    this.setAttribute('aria-role', 'switch');
    this.render();
  }

  // add animated transitions only after user starts monkeying with control
  // so it doesn't animate into initial state
  addTransition () {
    this.style.transition = '0.25s ease-out';
    this.thumb.style.transition = '0.25s ease-out';
  }

  mouseup () {
    if (! this.disabled) {
      this.addTransition();
      this.value = ! this.value;
    }
  }

  keyup (evt) {
    if (! this.disabled && evt.code === 'Space') {
      this.addTransition();
      this.value = ! this.value;
    }
  }

  get onColor () {
    return this.getAttribute('onColor') || '#0f0';
  }

  set onColor (c) {
    this.setAttribute('onColor', c);
  }

  get offColor () {
    return this.getAttribute('offColor') || '#ccc';
  }

  set offColor (c) {
    this.setAttribute('offColor', c);
  }

  get disabled () {
    return this.hasAttribute('disabled');
  }

  set disabled (x) {
    if (x) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get value () {
    return this.hasAttribute('value') && this.getAttribute('value') !== 'false';
  }

  set value (x) {
    x = x && x !== 'false';
    if (this.value !== x) {
      this.setAttribute('value', x);
      this.render();
      this.dispatchEvent(new Event('change'));
    }
  }

  render () {
    this.setAttribute('aria-checked', this.value ? 'on' : 'off');
    this.thumb.classList.toggle('on', this.value);
    this.style.backgroundColor = this.value ? this.onColor : this.offColor;
  }
}
window.customElements.define('b8r-switch', SlideToggle);
