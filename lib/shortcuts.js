// bindinator.js Copyright ©2016-2017 Tonio Loewald
/**
  Shortcuts allows shortcut or accelerator keytrokes to be assigned to any control
  via the `data-shortcut` attribute. Shortcuts will trigger a synthetic `shortcut`
  event when the shortcut is triggered.

  e.g.

  ```
  <button data-event="shortcut,click:_component_.action" data-shortcut="alt-Y">Yoink</button>
  <p>
    The button above has the shortcut <b>alt-Y</b>
  </p>
  <script>
    const {update} = await import('../lib/shortcuts.js');
    update();
    set({
      action: () => alert('yoink!'),
    })
  </script>
  ```

  The shortcut will trigger a synthetic 'shortcut' event on the target (after focusing it,
  and then shortly afterward blurring it.)
*/

import b8r from '../source/b8r.js'
b8r.on(document.body, 'keydown', 'shortcuts', 'key')
let shortcutTargets = b8r.find('[data-shortcut]')

b8r.register('shortcuts', {
  key (evt) {
    const keystroke = b8r.keystroke(evt)
    const matches = shortcutTargets.filter(elt => elt.dataset.shortcut === keystroke)

    if (matches.length > 0) {
      b8r.trigger('focus', matches[0])
      b8r.trigger('shortcut', matches[0])
      setTimeout(() => {
        b8r.trigger('blur', matches[0])
      }, 250)
      if (matches.length > 1) {
        console.warn('shortcut has more than one match', keystroke, matches) // jshint ignore:line
      }
    } else {
      return true
    }
  }
})

const specialKeys = {
  BracketLeft: '[',
  BracketRight: ']'
}

const addShortcutTitle = elt => {
  var caption = elt.dataset.shortcut.split('-')
  caption.forEach((s, i) => {
    caption[i] = b8r.modifierKeys[s] || specialKeys[s] || s
  })
  caption = caption.join('')
  elt.setAttribute('title', caption)
}

const update = () => {
  shortcutTargets = b8r.find('[data-shortcut]')
  shortcutTargets
    .filter(elt => !elt.hasAttribute('title'))
    .forEach(addShortcutTitle)
}

export { update }
