/**
# Emoji-Picker Component

**Note**: requires emoji-metadata.json, by default will pull it from github repo.

<b8r-component
  path="../components/emoji.component.js"
>
</b8r-component>
*/

export default {
  css: `
    ._component_ {
      display: flex;
      flex-direction: column;
      width: 385px;
      height: 290px;
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
      width: 40px;
      height: 40px;
      overflow: hidden;
      display: inline-block;
      font-size: 32px;
      margin: 0;
      cursor: default;
      line-height: 40px;
      text-align: center;
      border-radius: 3px;
      position: relative;
      border-radius: 99px;
      transition: 0.05s ease-out;
    }

    ._component_ > .scroll-region > .emoji:hover {
      font-size: 48px;
      width: 60px;
      height: 60px;
      line-height: 60px;
      margin: -10px;
      z-index: 2;
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

    ._component_ > .menu > * {
      flex: 1 1 auto;
      text-align: center;
    }

    ._component_ > .menu > *:hover {
      background: var(--black-20);
    }
  `,
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
  load: async ({ b8r, component, get, set, find, findOne }) => {
    const emojiPath = component.dataset.emojiPath || 'https://raw.githubusercontent.com/tonioloewald/emoji-metadata/master/emoji-metadata.json'

    b8r.json(emojiPath).then(emoji => {
      const categories = emoji.reduce((c, emoji) => {
        if (! c.find(e => emoji.category === e.category)) c.push(emoji)
        return c;
      }, [])
      console.log(categories)
      set({emoji, categories})
    })
    set({
      pickCategory(_, target) {
        const instance = b8r.getListInstance(target);
        const elt = [...find('.emoji')].find(elt => elt._b8rListInstance === instance)
        elt.scrollIntoView({behavior: "smooth"});
      },
      pick(_, target) {
        set('value', b8r.getListInstance(target).chars)
      }
    })
  }
}