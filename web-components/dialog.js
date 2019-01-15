/**
# Dialog

`<dialog-modal>` simply places its content in a centered box with a translucent dark
overlay covering the rest of the window.

By default, the dialog will initially be hidden. To show it, set its `active` attribute
to `true` or call its `show()` method.

The element has several methods:

- `addCallback` adds a listener that will be passed the value of the dialog when it's closed.
- `close(value)` closes (hides) the dialog and sets its value
- `show` and `hide` do the obvious.

Note that the contents of the dialog are simply whatever you put in them. There's no magic.

> ### Button Shortcuts
> 
> Any `button.dialog-modal-button` that is provided with a `data-shortcut` attribute
> will automatically be "clicked" if the specified key (i.e. `Event.key`) is pressed
> while the dialog is in focus.

## dialogAlert, dialogConfirm, and dialogPrompt

These are utility functions that return promises of the user response. They are
simple examples of dialog-modal.

    dialogAlert(message, title=window.location.host)
    dialogConfirm(message, title=window.location.host, buttons=_confirm_buttons)
    dialogPrompt(message='Enter some text', text='', title=window.location.host)

The default buttons are specified thus:

    const _ok_button = {name: 'OK', shortcut: 'Enter'};

    const _confirm_buttons = [
      _ok_button,
      {name: 'Cancel', shortcut: 'Escape'},
    ];

Note that the shortcuts leverage the behavior described above under **button shortcuts**.

```
    <style>
      .dialog-modal-frame {
        display: flex;
        flex-direction: column;
      }

      button[data-shortcut="Enter"],
      button.default {
        background: #ddf;
      }

      .dialog-modal-title {
        padding: 5px 10px;
        font-weight: bold;
        background: #eee;
      }

      .dialog-modal-input {
        padding: 2px 4px;
        margin: 5px 10px;
      }

      .dialog-modal-message {
        margin: 5px 10px;
      }

      .dialog-modal-button-set {
        text-align: right;
        margin: 0 10px 10px;
      }

      .dialog-modal-button + .dialog-modal-button {
        margin-left: 5px;
      }
    </style>
    <dialog-modal>
      <div class="dialog-modal-frame">
        <div class="dialog-modal-title">Modal</div>
        <div class="dialog-modal-message">Here is some text</div>
        <label class="dialog-modal-message">
          Text field
          <input placeholder="type something" data-event="
            keydown(Escape):dialog-demo.cancel;
            keydown(Enter):dialog-demo.ok;
          ">
        </label>
        <div class="dialog-modal-button-set">
          <button data-event="click:dialog-demo.cancel">Cancel</button>
          <button class="default" data-event="click:dialog-demo.ok">OK</button>
        </div>
      </div>
    </dialog-modal>
    <p data-bind="json=dialog-demo.result"></p>
    <button data-event="click:dialog-demo.showDialog">Show Dialog</button>
    <button data-event="click:dialog-demo.showAlert">dialogAlert</button>
    <button data-event="click:dialog-demo.showConfirm">dialogConfirm</button>
    <button data-event="click:dialog-demo.showPrompt">dialogPrompt</button>
    <script>
      require('web-components/dialog.js');
      const {
        dialogAlert,
        dialogConfirm,
        dialogPrompt,
      } = require('web-components/dialog.js');
      const dialog = findOne('dialog-modal');
      const input = dialog.querySelector('input');
      dialog.addCallback(value => b8r.set('dialog-demo.result', value));
      b8r.register('dialog-demo', {
        result: {},
        showDialog(){
          dialog.show();
        },
        async showAlert(){
          b8r.set('dialog-demo.result', null);
          const buttonClicked = await dialogAlert('This is a test');
          b8r.set('dialog-demo.result', {buttonClicked});
        },
        async showConfirm(){
          b8r.set('dialog-demo.result', null);
          const buttonClicked = await dialogConfirm('This is a test');
          b8r.set('dialog-demo.result', {buttonClicked});
        },
        async showPrompt(){
          b8r.set('dialog-demo.result', null);
          const text = await dialogPrompt('Edit this', 'some text');
          b8r.set('dialog-demo.result', {text});
        },
        cancel(){
          dialog.close({text: null, buttonClicked: 'cancel'});
        },
        ok(){
          dialog.close({text: input.value, buttonClicked: 'ok'});
        },
      });
    </script>
```
*/

const {
  makeWebComponent,
  makeElement,
  fragment,
  div,
  input,
  button,
} = require('../lib/web-components.js');

const DialogModal = makeWebComponent('dialog-modal', {
  value: true,
  attributes: {
    active: false,
  },
  props: {
    callbacks: [],
  },
  methods: {
    addCallback(fn) {
      this.callbacks.push(fn);
    },
    close(value) {
      if (value !== undefined) this.value = value; 
      this.callbacks.forEach(callback => callback(this.value));
      this.active = false;
    },
    show() {
      this.active = true;
    },
    hide() {
      this.active = false;
    },
    handleShortcut(evt) {
      const {key} = evt;
      const button = this.querySelector(`.dialog-modal-button[data-shortcut="${key}"]`);
      if (button) {
        button.click();
        evt.stopPropagation();
        evt.preventDefault();
      }
    },
    render() {
      let display = 'none';
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', 0);
        this.addEventListener('keydown', this.handleShortcut.bind(this)); 
      }
      if (this.active) {
        display = '';
        requestAnimationFrame(() => {
          const elt = this.querySelector('input,textarea,button,select,[tabindex]');
          if (elt) elt.focus();
        });
      }
      this.shadowRoot.querySelector('slot').style.display = display;
      this.style.display = display;
    },
  },
  style: {
    ':host': {
      display: 'block',
      position: 'fixed',
      background: 'rgba(0,0,0,0.25)',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
    },
    'slot': {
      display: 'block',
      position: 'fixed',
      background: 'white',
      left: '50%',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      borderRadius: '4px',
      boxShadow: '0 10px 20px 0 rgba(0,0,0,0.5)',
    },
  },
});

const _ok_button = {name: 'OK', shortcut: 'Enter'};

const _confirm_buttons = [
  _ok_button,
  {name: 'Cancel', shortcut: 'Escape'},
];

const _makeButtons = (buttons) => 
  buttons.map(({name, shortcut}) => button({
    content: name,
    classes: ['dialog-modal-button'],
    attributes: {
      title: `[${shortcut}] ${name}`,
      'data-shortcut': shortcut,
    }
  }));

const dialogAlert = (message, title=window.location.host) => dialogConfirm(message, title, [_ok_button]);

const dialogConfirm = (message, title=window.location.host, buttons=_confirm_buttons) => 
  new Promise((resolve, reject) => {
    const dialog = new DialogModal();
    const _title = div({content: title, classes: ['dialog-modal-title']});
    const _message = div({content: message, classes: ['dialog-modal-message']});
    const _buttonSet = div({content: _makeButtons(buttons), classes: ['dialog-modal-button-set']});
    const _frame = div({
      content: [_title, _message, _buttonSet],
      classes: ['dialog-modal-frame'],
    });
    const _action = (evt) => {
      dialog.remove();
      resolve(evt.target.textContent);
    };
    dialog.appendChild(_frame);
    [...dialog.querySelectorAll('.dialog-modal-button')].forEach(_button => _button.addEventListener('click', _action));
    document.body.appendChild(dialog);
    dialog.show();
  });

const dialogPrompt = (message='Enter some text', text='', title=window.location.host) => 
  new Promise((resolve, reject) => {
    const dialog = new DialogModal();
    const _title = div({content: title, classes: ['dialog-modal-title']});
    const _message = div({content: message, classes: ['dialog-modal-message']});
    const _input = input({classes: ['dialog-modal-input']});
    _input.value = text;
    const _buttonSet = div({content: _makeButtons(_confirm_buttons), classes: ['dialog-modal-button-set']});
    const _frame = div({
      content: [_title, _message, _input, _buttonSet],
      classes: ['dialog-modal-frame'],
    });
    dialog.appendChild(_frame);
    const _action = (evt) => {
      dialog.remove();
      resolve(evt.target.textContent === 'OK' ? dialog.querySelector('input').value : null);
    };
    [...dialog.querySelectorAll('button')].forEach(_button => _button.addEventListener('click', _action));
    document.body.appendChild(dialog);
    dialog.show();
    dialog.querySelector('input').setSelectionRange(0, 32000);
  });

module.exports = {
  DialogModal,
  dialogAlert,
  dialogConfirm,
  dialogPrompt,
}