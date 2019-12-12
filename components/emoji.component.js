/**
# Emoji-Picker Component

**Note**: requires emoji-metadata.json

<b8r-component
  path="../components/emoji.component.js"
>
</b8r-component>
*/

export default {
  css: `
    ._component_ {
      display: block;
      width: 360px;
      height: 240px;
      overflow-x: hidden;
      overflow-y: scroll;
      overflow-y: overlay;
    }

    ._component_ > .scroll-region {
      margin-right: -10px;
      width: 100%;
    }

    ._component_ > .scroll-region > .emoji {
      width: 60px;
      height: 60px;
      overflow: hidden;
      display: inline-block;
      font-size: 48px;
      margin: 0;
    }
  `,
  html: `
    <div class="scroll-region">
      <div 
        class="emoji"
        data-list="_component_.emoji:chars"
        data-bind="text=.chars"
      >
      </div>
    </div>`,
  load: async ({ b8r, get, set, findOne }) => {
    b8r.json('../node_modules/emoji-metadata/emoji-metadata.json').then(emoji => {
      console.log(emoji)
      set({emoji})
    })
  }
}