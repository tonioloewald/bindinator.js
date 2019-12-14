/**
# Emoji-Picker Component

This is an emoji picker. Its `value`` will be set to the emoji the user selects.
The current `value` of the component will be scrolled into view.

You can also call the component's `show` method to scroll a specific emoji into view.

**Note**: uses emoji-metadata.json, by default it will pull it from my github repo,
pass the url of a better version via `data-emoji-path`.

```
<b8r-component
  path="../components/emoji.component.js"
  data-bind="value=_component_.emoji"
>
</b8r-component>
<div
  style="font-size: 60px; line-height: 60px; padding: 10px; text-align: center"
  data-bind="text=_component_.emoji"
></div>
<script>
  set('emoji', '🙈')
</script>
```
*/

export default {
  css: `
    ._component_ {
      --emoji-picker-width: 385px;
      --emoji-picker-height: 280px;
      --emoji-tile-size: 40px;
      --emoji-tile-font-size: 32px;
      --emoji-tile-hover-size: 60px;
      --emoji-tile-hover-font-size: 48px;
    }

    ._component_ {
      display: flex;
      flex-direction: column;
      width: var(--emoji-picker-width);
      height: var(--emoji-picker-height);
    }

    ._component_ > .scroll-region {
      flex: 1 1 auto;
      width: 100%;
      padding: 10px;
      overflow-x: hidden;
      overflow-y: scroll;
      overflow-y: overlay;
    }

    ._component_ > .scroll-region > .emoji {
      width: var(--emoji-tile-size);
      height: var(--emoji-tile-size);
      overflow: hidden;
      display: inline-block;
      font-size: var(--emoji-tile-font-size);
      margin: 0;
      cursor: default;
      line-height: var(--emoji-tile-size);
      text-align: center;
      border-radius: 3px;
      position: relative;
      border-radius: 99px;
      transition: 0.05s ease-out;
    }

    ._component_ > .scroll-region > .emoji:hover {
      font-size: var(--emoji-tile-hover-font-size);
      width: var(--emoji-tile-hover-size);
      height: var(--emoji-tile-hover-size);
      line-height: var(--emoji-tile-hover-size);
      margin: -10px;
      z-index: 2;
    }

    ._component_ > .menu {
      flex: 0 0 30px;
      display: flex;
      justify-content: center;
      font-size: 24px;
      line-height: 30px;
      background: var(--black-10);
      width: 100%;
      cursor: default;
    }

    ._component_ > .menu > * {
      flex: 1 1 auto;
      text-align: center;
    }

    ._component_ > .menu > *:hover {
      background: var(--black-20);
    }`,
  html: `
    <div class="menu">
      <div 
        data-list="_component_.categories:chars"
        data-bind="
          attr(title)=.category
          text=.chars
        "
        data-event="click:_component_.pickCategory"
      >
      </div>
    </div>
    <div class="scroll-region">
      <div 
        class="emoji"
        data-list="_component_.emoji:chars"
        data-bind="
          text=.chars
          attr(title)=.name
        "
        data-event="click:_component_.pick"
      >
      </div>
    </div>`,
  load: async ({ b8r, component, on, get, set, find, findOne }) => {
    const emojiPath = component.dataset.emojiPath || 'https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json'
    const show = emoji => {
      const elt = [...find('.emoji')].find(elt => elt._b8rListInstance.chars === emoji)
      elt.scrollIntoView({ behavior: 'smooth' })
    }
    b8r.json(emojiPath).then(emoji => {
      const categories = emoji.reduce((c, emoji) => {
        if (!c.find(e => emoji.category === e.category)) c.push(emoji)
        return c
      }, [])
      set({ emoji, categories })
      // after the emoji have been rendered, we should scroll the current value into view
      b8r.afterUpdate(() => {
        const value = get('value')
        if (value) show(value)
      })
    })
    set({
      show,
      pickCategory (_, target) {
        const instance = b8r.getListInstance(target)
        show(instance.chars)
      },
      pick (_, target) {
        set('value', b8r.getListInstance(target).chars)
      }
    })
  }
}
