/**
# Keystroke

Leverages the modern browser's event "code" to identify keystrokes,
and uses a normalized representation of modifier keys (in alphabetical)
order.

* **alt** represents the alt or option keys
* **ctrl** represents the control key
* **meta** represents the windows, command, or meta keys
* **shift** represents the shift keys

To get a normalized representation of a keystroke:

    keystroke(event) // => produces normalized keystroke of the form alt-X

```
<label>
  Type in here
  <input style="width: 60px;" data-event="keydown:_component_.key">
</label>
<div data-bind="text=_component_.keystroke"></div>
<script>
  const {keystroke} = await import('../source/b8r.keystroke.js');
  const key = evt => {
    set('keystroke', keystroke(evt));
    return true; // process keystroke normally
  };
  set ({key});
</script>
```
## Modifier Keys

Also provides modifierKeys, a map from the modifier strings (e.g. alt) to
the relevant unicode glyphs (e.g. '⌥').
*/
/* global module */
'use strict'

const keycode = evt => {
  if (evt.code) {
    return evt.code.replace(/Key|Digit/, '')
  } else {
    let syntheticCode = evt.keyIdentifier
    if (syntheticCode.substr(0, 2) === 'U+') {
      syntheticCode =
          String.fromCharCode(parseInt(evt.keyIdentifier.substr(2), 16))
    }
    return syntheticCode
  }
}

const keystroke = evt => {
  const code = []
  if (evt.altKey) {
    code.push('alt')
  }
  if (evt.ctrlKey) {
    code.push('ctrl')
  }
  if (evt.metaKey) {
    code.push('meta')
  }
  if (evt.shiftKey) {
    code.push('shift')
  }
  code.push(keycode(evt))
  return code.join('-')
}

const modifierKeys = {
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  escape: '⎋',
  shift: '⇧'
}

export { keystroke, keycode, modifierKeys }
