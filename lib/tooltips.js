/**
# tooltips

Usage:

    <div aria-label="enter tooltip text here">
      ...
    </div>

And somewhere:

    require('path/to/tooltips.js');

To access the tooltip div directly:

    const {tooltip} = require('path/to/tooltips.js');
    tooltip.style.fontSize = '14px';

To override the default look, either write your own CSS rules for `.tooltips-tooltip` or
manipulate the tooltip directly, as above. (There's only one tooltip and it never gets destroyed.)

```
<p aria-label="Yup, even I, a humble paragraph, have a tooltip."
>Notice the out-of-bounds buttons at the top-right and bottom-left of the window!</p>
<button aria-label="See! I told you!">I has tooltip</button>
<button
  aria-label="See! I told you!"
  data-tooltip-position="above"
>I also has tooltip, but it's above me</button>
<button aria-label="
  Do you see any Teletubbies in here? Do you see a slender plastic tag clipped to my shirt with my
  name printed on it? Do you see a little Asian child with a blank expression on his face sitting
  outside on a mechanical helicopter that shakes when you put quarters in it? No? Well, that's what
  you see at a toy store. And you must think you're in a toy store, because you're here shopping for
  an infant named Jeb.
">I has a really long tooltip</button>
<button
  style="position: fixed; top: 5px; right: 5px; z-index: 20"
  data-tooltip-position="above"
  aria-label="
    Do you see any Teletubbies in here? Do you see a slender plastic tag clipped to my shirt with my
    name printed on it? Do you see a little Asian child with a blank expression on his face sitting
    outside on a mechanical helicopter that shakes when you put quarters in it? No? Well, that's what
    you see at a toy store. And you must think you're in a toy store, because you're here shopping for
    an infant named Jeb.
  "
>Out-of-bounds-test</button>
<button
  style="position: fixed; bottom: 5px; left: 5px; z-index: 20"
  aria-label="
    Do you see any Teletubbies in here? Do you see a slender plastic tag clipped to my shirt with my
    name printed on it? Do you see a little Asian child with a blank expression on his face sitting
    outside on a mechanical helicopter that shakes when you put quarters in it? No? Well, that's what
    you see at a toy store. And you must think you're in a toy store, because you're here shopping for
    an infant named Jeb.
  "
>Out-of-bounds-test</button>
<script>
  const {tooltip} = await import('../lib/tooltips.js');

  tooltip.style.background = '#007'; // James Bond Blue!
  tooltip.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';

</script>
```

> What about `aria-describedby` and `aria-describes`? Well, exactly how are you going to
> make a control more accessible to vision-impaired people using screen readers with something
> you can't put in a text attribute? Happy to implement support for this if we can find an example.
*/
import b8r from '../source/b8r.js'

export const tooltip = b8r.create('div')
tooltip.classList.add('tooltips-tooltip')
tooltip.style.position = 'fixed'
tooltip.style.zIndex = 999
tooltip.style.pointerEvents = 'none'

let tooltipTarget = null
let removeTimeout = null

b8r.register('tooltip-controller', {
  show (evt) {
    const { target } = evt
    const text = target.getAttribute('aria-label')
    if (tooltipTarget !== target && text) {
      tooltipTarget = target
      tooltip.style.opacity = 1
      clearTimeout(removeTimeout)
      const rect = target.getBoundingClientRect()
      tooltip.textContent = text

      // append it now so we can use its dimensions accurately
      document.body.appendChild(tooltip)
      let left = (rect.left + rect.width * 0.5 - tooltip.offsetWidth * 0.5)
      let top
      if (target.dataset.tooltipPosition === 'above') {
        top = rect.top - tooltip.offsetHeight - 5
      } else {
        top = rect.bottom + 5
      }
      // force up/down if space demands it
      if (top < 5) {
        top = rect.bottom + 5
      } else if (top + tooltip.offsetHeight > window.innerHeight - 5) {
        top = rect.top - tooltip.offsetHeight - 5
      }

      // force left/right if space demands it
      if (left < 5) {
        left = 5
      } else if (left + tooltip.offsetWidth > window.innerWidth - 5) {
        left = window.innerWidth - 5 - tooltip.offsetWidth
      }
      b8r.styles(tooltip, { top: top + 'px', left: left + 'px' })
    }
    return true
  },

  hide (evt) {
    if (evt.target === tooltipTarget) {
      tooltip.style.opacity = 0
      tooltipTarget = null
      removeTimeout = setTimeout(() => tooltip.remove(), 500)
    }
    return true
  }
})

b8r.onAny('mouseenter', 'tooltip-controller.show')
b8r.onAny('mouseleave', 'tooltip-controller.hide')
