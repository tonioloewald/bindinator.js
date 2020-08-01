/**
# Keystroke

Leverages the modern browser's `event.code` to identify keystrokes,
and uses a normalized representation of modifier keys (in alphabetical)
order.

* **alt** represents the alt or option keys
* **ctrl** represents the control key
* **meta** represents the windows, command, or meta keys
* **shift** represents the shift keys

To get a normalized representation of a keystroke:

    keystroke(event) // => produces normalized keystroke of the form alt-X

`b8r`'s keyboard event handling provides a convenient feature to specify
one or more specified keystrokes for an event to handle, e.g.

    <body data-event="
      keyup(meta-Q):app.quit;
      keyup(Tab,ctrl-Space):app.togglePalettes
    ">

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

Also provides `modifierKeys`, a map from the modifier strings (e.g. alt) to
the relevant unicode glyphs (e.g. '⌥').
*/

const keycode = evt => {
  if (evt.code) {
    return evt.code.replace(/Key|Digit/, '')
  } else {
    let syntheticCode = evt.key
    if (syntheticCode.substr(0, 2) === 'U+') {
      syntheticCode = String.fromCharCode(parseInt(evt.key.substr(2), 16))
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

/**
~~~~
// title: dispatch tests

function dispatch(target, eventType, key) {
  const evt = new KeyboardEvent({
    key
  })
  target.dispatchEvent(evt)
}
const input = document.createElement('input')
document.body.append(input)
const results = []
b8r.register('_keystroke_test_', {
  first(evt){
    console.log('first', evt)
    results.push({first: input.vaue})
  },
  second(evt){ results.push({second: input.vaue}) },
  third(evt){ results.push({third: input.vaue}) },
})
b8r.on(input, 'keydown(A)', '_keystroke_test_.first')
b8r.on(input, 'keydown(0,1)', '_keystroke_test_.second')
b8r.on(input, 'keydown(C,D,E)', '_keystroke_test_.third')
dispatch(input, 'keydown', 'C')
dispatch(input, 'keydown', 'D')
dispatch(input, 'keydown', 'E')
dispatch(input, 'keydown', '1')
dispatch(input, 'keydown', '0')
dispatch(input, 'keydown', '\n')
dispatch(input, 'keydown', '\t')
input.remove()
// b8r.remove('_keystroke_test_')
~~~~
*/
