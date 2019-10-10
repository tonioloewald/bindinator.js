/**
# Dialog

`<b8r-modal>` simply places its content in a centered box with a translucent dark
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
> Any `button.b8r-modal-button` that is provided with a `data-shortcut` attribute
> will automatically be "clicked" if the specified key (i.e. `Event.key`) is pressed
> while the dialog is in focus.

## dialogAlert, dialogConfirm, and dialogPrompt

These are utility functions that return promises of the user response. They are
simple examples of b8r-modal.

    dialogAlert(message, title=window.location.host)
    dialogConfirm(message, title=window.location.host, buttons=_confirmButtons)
    dialogPrompt(message='Enter some text', text='', title=window.location.host)

The default buttons are specified thus:

    const _okButton = {name: 'OK', shortcut: 'Enter'};

    const _confirmButtons = [
      _okButton,
      {name: 'Cancel', shortcut: 'Escape'},
    ];

Note that the shortcuts leverage the behavior described above under **button shortcuts**.

```
    <style>
      .b8r-modal-frame {
        display: flex;
        flex-direction: column;
      }

      button[data-shortcut="Enter"],
      button.default {
        background: var(--light-accent-color);
      }

      .b8r-modal-title {
        padding: 5px 10px;
        font-weight: bold;
        background: var(--input-bg-color);
      }

      .b8r-modal-input {
        padding: 2px 4px;
        margin: 5px 10px;
      }

      .b8r-modal-message {
        margin: 5px 10px;
      }

      .b8r-modal-button-set {
        text-align: right;
        margin: 0 10px 10px;
      }

      .b8r-modal-button + .b8r-modal-button {
        margin-left: 5px;
      }
    </style>
    <b8r-modal>
      <div class="b8r-modal-frame">
        <div class="b8r-modal-title">Modal</div>
        <div class="b8r-modal-message">Here is some text</div>
        <label class="b8r-modal-message">
          Text field
          <input placeholder="type something" data-event="
            keydown(Escape):dialog-demo.cancel;
            keydown(Enter):dialog-demo.ok;
          ">
        </label>
        <div class="b8r-modal-button-set">
          <button data-event="click:dialog-demo.cancel">Cancel</button>
          <button class="default" data-event="click:dialog-demo.ok">OK</button>
        </div>
      </div>
    </b8r-modal>
    <p data-bind="json=dialog-demo.result"></p>
    <button data-event="click:dialog-demo.showDialog">Show Dialog</button>
    <button data-event="click:dialog-demo.showAlert">dialogAlert</button>
    <button data-event="click:dialog-demo.showConfirm">dialogConfirm</button>
    <button data-event="click:dialog-demo.showPrompt">dialogPrompt</button>
    <script>
      const {
        dialogAlert,
        dialogConfirm,
        dialogPrompt,
      } = await import('../web-components/dialog.js');
      const dialog = findOne('b8r-modal');
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
~~~~
const {webComponentTest} = await import('../web-components/web-component-test.js')
webComponentTest(Test, '../web-components/dialog.js', 'b8r-modal')
~~~~
*/
/* global requestAnimationFrame */

import {
  makeWebComponent,
  div,
  input,
  button
} from '../source/web-components.js'

const DialogModal = makeWebComponent('b8r-modal', {
  attributes: {
    value: null,
    active: false
  },
  props: {
    callbacks: []
  },
  methods: {
    addCallback (fn) {
      this.callbacks.push(fn)
    },
    close (value) {
      if (value !== undefined) this.value = value
      this.callbacks.forEach(callback => callback(this.value))
      this.active = false
    },
    show () {
      this.active = true
    },
    hide () {
      this.active = false
    },
    handleShortcut (evt) {
      const { key } = evt
      const button = this.querySelector(`.b8r-modal-button[data-shortcut="${key}"]`)
      if (button) {
        button.click()
        evt.stopPropagation()
        evt.preventDefault()
      }
    },
    render () {
      let display = 'none'
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', 0)
        this.addEventListener('keydown', this.handleShortcut.bind(this))
      }
      if (this.active) {
        display = 'block'
        requestAnimationFrame(() => {
          const elt = this.querySelector('input,textarea,button,select,[tabindex]')
          if (elt) elt.focus()
        })
      }
      this.shadowRoot.querySelector('slot').style.display = display
      this.style.display = display
    }
  },
  style: {
    ':host': {
      display: 'none',
      position: 'fixed',
      background: 'rgba(0,0,0,0.25)',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 100
    },
    slot: {
      display: 'block',
      position: 'fixed',
      background: 'var(--content-bg-color)',
      left: '50%',
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      borderRadius: '4px',
      boxShadow: '0 10px 20px 0 rgba(0,0,0,0.5)'
    }
  }
})

const _okButton = { name: 'OK', shortcut: 'Enter' }

const _confirmButtons = [
  _okButton,
  { name: 'Cancel', shortcut: 'Escape' }
]

const _makeButtons = (buttons) =>
  buttons.map(({ name, shortcut }) => button({
    content: name,
    classes: ['b8r-modal-button'],
    attributes: {
      title: `[${shortcut}] ${name}`,
      'data-shortcut': shortcut
    }
  }))

const dialogAlert = (message, title = window.location.host) => dialogConfirm(message, title, [_okButton])

const dialogConfirm = (message, title = window.location.host, buttons = _confirmButtons) =>
  new Promise((resolve, reject) => {
    const dialog = new DialogModal()
    const _title = div({ content: title, classes: ['b8r-modal-title'] })
    const _message = div({ content: message, classes: ['b8r-modal-message'] })
    const _buttonSet = div({ content: _makeButtons(buttons), classes: ['b8r-modal-button-set'] })
    const _frame = div({
      content: [_title, _message, _buttonSet],
      classes: ['b8r-modal-frame']
    })
    const _action = (evt) => {
      dialog.remove()
      resolve(evt.target.textContent)
    }
    dialog.appendChild(_frame);
    [...dialog.querySelectorAll('.b8r-modal-button')].forEach(_button => _button.addEventListener('click', _action))
    document.body.appendChild(dialog)
    dialog.show()
  })

const dialogPrompt = (message = 'Enter some text', text = '', title = window.location.host) =>
  new Promise((resolve, reject) => {
    const dialog = new DialogModal()
    const _title = div({ content: title, classes: ['b8r-modal-title'] })
    const _message = div({ content: message, classes: ['b8r-modal-message'] })
    const _input = input({ classes: ['b8r-modal-input'] })
    _input.value = text
    const _buttonSet = div({ content: _makeButtons(_confirmButtons), classes: ['b8r-modal-button-set'] })
    const _frame = div({
      content: [_title, _message, _input, _buttonSet],
      classes: ['b8r-modal-frame']
    })
    dialog.appendChild(_frame)
    const _action = (evt) => {
      dialog.remove()
      resolve(evt.target.textContent === 'OK' ? dialog.querySelector('input').value : null)
    };
    [...dialog.querySelectorAll('button')].forEach(_button => _button.addEventListener('click', _action))
    document.body.appendChild(dialog)
    dialog.show()
    dialog.querySelector('input').setSelectionRange(0, 32000)
  })

export {
  DialogModal,
  dialogAlert,
  dialogConfirm,
  dialogPrompt
}
