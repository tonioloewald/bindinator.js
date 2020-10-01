/**
# Emoji-Picker Component

This is an emoji picker. Its `value` will be set to the emoji the user selects.
On initial render, the current `value` of the component will be scrolled into view.

You can also call the component's `show` method to scroll a specific emoji into view.

**Note**: uses emoji-metadata.json, by default it will pull it from my github repo,
pass the url of a better version via `data-emoji-path`.

```
<b8r-component
  path="../components/emoji.component.js"
  data-bind="value=_component_.emoji"
>
</b8r-component>
<span
  style="font-size: 60px; margin: 10px;"
  data-bind="text=_component_.emoji"
></span>
<script>
  set('emoji', '🙈')
</script>
```
*/

export default {
  css: `
    ._component_ {
      --emoji-picker-width: 385px;
      --emoji-picker-height: 320px;
      --emoji-tile-size: 40px;
      --emoji-tile-font-size: 32px;
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
      transition: var(--hover-transition);
    }

    ._component_ > .scroll-region > .emoji:hover {
      background: var(--black-10);
    }

    ._component_ > .scroll-region > .emoji:active {
      background: var(--black-20);
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

    ._component_ > .filter {
      flex: 0 0 30px;
    }

    ._component_ > .filter > input {
      background: var(--black-10);
      width: 100%;
      border-radius: 99px;
      padding: 5px 10px;
      margin: 1px;
      border: 0;
    }

    ._component_ > .menu > * {
      flex: 1 1 auto;
      text-align: center;
      transition: var(--hover-transition);
    }

    ._component_ > .menu > :hover {
      background: var(--black-10);
    }

    ._component_ > .menu > :active {
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
        data-list="_component_.filter(_component_.emoji,_component_.filterText):chars"
        data-bind="
          text=.chars
          attr(title)=.name
        "
        data-event="click:_component_.pick"
      >
      </div>
    </div>
    <div class="filter">
      <input
        placeholder="filter text"
        data-bind="value=_component_.filterText"
      >
    </div>`,
  load: async ({ b8r, component, on, get, set, find, findOne }) => {
    const emojiPath = component.dataset.emojiPath || 'https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json'
    const show = async (emoji) => {
      if (get('filterText')) set('filterText', '')
      await b8r.afterUpdate(() => {
        const elt = [...find('div.emoji')].find(elt => elt._b8rListInstance.chars === emoji)
        elt.scrollIntoView({ behavior: 'smooth' }) // note -- smooth not implemented in Safari
      })
    }
    b8r.json(emojiPath).then(emoji => {
      const categories = emoji.reduce((c, emoji) => {
        if (!c.find(e => emoji.category === e.category)) c.push(emoji)
        return c
      }, [])
      set({ emoji, categories })
      // after the emoji have been rendered, we should scroll the current value into view
      emoji.forEach(e => {
        e.searchText = `${e.name} ${e.category} ${e.subcategory}`.toLocaleLowerCase()
      })
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
      },
      filterText: '',
      filter (emoji, filterText) {
        const words = filterText.toLocaleLowerCase().replace(/\s+/g, ' ').split(' ')
        return filterText ? emoji.filter(e => words.find(w => e.searchText.includes(w))) : emoji
      }
    })
  }
}
