/**
# DX Card
<style>
  .dx-card-component {
    filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.5));
  }
</style>
<b8r-component path='../dx/dx-card.component.js'></b8r-component>
*/

const cardFaceComponent = {
  html: `
    <div
      class='status active'
      contenteditable='true'
      placeholder='status'
      data-bind='text=_component_.value.active' 
    >ACTIVE</div>
    <div
      class='body top'
      contenteditable='true'
      placeholder='description'
      data-bind='text=_component_.value.top' 
    >Top block</div>
    <div
      class='status flipped'
      contenteditable='true'
      placeholder='status'
      data-bind='text=_component_.value.flipped' 
    >FLIPPED</div>
    <div
      class='body bottom'
      contenteditable='true'
      placeholder='description'
      data-bind='text=_component_.value.bottom' 
    >Bottom block</div>
    <div
      class='status right'
      contenteditable='true'
      placeholder='status'
      data-bind='text=_component_.value.right' 
    >RIGHT</div>
    <div 
      class='status left'
      contenteditable='true'
      placeholder='status'
      data-bind='text=_component_.value.left' 
    >LEFT</div>
  `,
}

export default {
  css: `
    ._component_ {
      --card-bg: white;
      --card-text: black;
      --card-back-bg: #a33;
      --card-back-text: white;
      --card-size: 396px;
      --card-padding: 40px;
      --card-radius: calc(var(--card-padding) * 0.67);
      --card-inner-size: calc(var(--card-size) - var(--card-padding) * 2);
      --card-font-size: 24px;
      --status-font-size: calc(var(--card-font-size) * 0.9);
      --title-padding: calc(var(--card-padding) * 0.5);
      --body-padding: calc(var(--card-padding) * 0.25);
      --title-offset: calc(var(--card-size) * -0.5 + var(--card-padding) * 0.5);
      --body-font-size: calc(var(--card-font-size) * 0.6);
      --body-lineheight: calc(var(--body-font-size) * 1.33);
    }

    .card {
      font-size: var(--card-font-size);
      display: inline-block;
      margin: calc(var(--card-padding) * 0.5);
      background: var(--card-bg);
      color: var(--card-text);
      width: var(--card-size);
      height: var(--card-size);
      border-radius: var(--card-radius);
      position: relative;
      transform: rotateZ(0deg);
      transition: transform 0.5s ease-in-out;
    }

    .back {
      background: var(--card-back-bg);
      color: var(--card-back-text);
    }
    
    ._component_ b,
    ._component_ em {
      color: var(--card-back-bg);
    }
    
    ._component_ .back b,
    ._component_ .back em {
      color: var(--card-text);
    }

    ._component_ [contenteditable='true'] {
      background: transparent;
      color: inherit;
      box-shadow: none;
      transition: 0.25s ease-out;
      border-radius: calc(var(--card-padding) * 0.125);
      box-shadow: inset 0 0 0 0 rgba(0,0,255,0);
    }

    ._component_ [contenteditable='true']:empty {
      min-width: 120px;
    }

    ._component_ [contenteditable="true"]:hover {
      background: #ddd !important;
      color: #222 !important;
      box-shadow: inset 0 0 0 4px rgba(0,0,255,0.25);
    }

    ._component_ [contenteditable='true']:focus {
      background: white !important;
      color: black !important;
      box-shadow: inset 0 0 0 4px rgba(0,0,255,0.5);
    }

    .status {
      font-size: var(--status-font-size);
      font-weight: normal;
      position: absolute;
      left: 50%;
      top: 50%;
      padding: var(--body-padding);
      transform-origin: 50% 50%;
      white-space: nowrap;
      text-align: center;
      vertical-align: middle;
    }
    .status.active {
      transform: translateX(-50%) translateY(-50%) translateY(var(--title-offset));
      color: var(--card-back-text);
      background: var(--card-back-bg);
      --status-radius: calc(var(--card-padding) * 0.25);
      border-radius: 0 0 var(--status-radius) var(--status-radius);
    }
    .back .status.active {
      background: var(--card-text);
      color: var(--card-bg);
    }
    .right {
      transform: translateX(-50%) translateY(-50%) rotateZ(90deg) translateY(var(--title-offset));
    }
    .left {
      transform: translateX(-50%) translateY(-50%) rotateZ(-90deg) translateY(var(--title-offset));
    }
    .flipped {
      transform: translateX(-50%) translateY(-50%) rotateZ(-180deg) translateY(var(--title-offset));
    }

    .title {
      font-size: 150%;
      font-weight: bold;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%) translateY(-50%);
      white-space: nowrap;
      width: calc(100% - var(--card-inset));
      text-align: center;
      font-weight: normal;
      padding: var(--title-padding);
    }

    .body {
      position: absolute;
      font-size: var(--body-font-size);
      line-height: var(--body-lineheight);
      top: var(--card-padding);
      left: var(--card-padding);
      right: var(--card-padding);
      padding: var(--body-padding);
      background: rgba(0,0,0,0.1);
    }

    .bottom {
      transform: translateY(calc(var(--card-inner-size) - 100%)) rotateZ(180deg);
    }

    ._component_ label {
      height: var(--card-padding);
      line-height: var(--card-padding);
    }

    ._component_ input {
      vertical-align: middle;
    }
  `,
  html: `
    <div 
      class='card'
      data-event='focusin:_component_.orient'
      data-bind='attr(style)=--card-back-bg: $\{_component_.value.backgroundColor}'
    >
      <div 
        class='title' 
        data-bind='format=_component_.value.title',
        data-event='focus:_component_.editFormat;blur:_component_.editFormat'
        placeholder='status'
        contenteditable='true'>FACE</div
      >
      <b8r-component name="dx-card-face" data-bind="value=_component_.value.face"></b8r-component>
    </div>
    <div 
      class='card back' 
      data-event='focusin:_component_.orient'
      data-bind='attr(style)=--card-back-bg: $\{_component_.value.backgroundColor}'
    >
      <div 
        class='title' 
        data-bind='format=_component_.value.title'
        data-event='focus:_component_.editFormat;blur:_component_.editFormat'
        placeholder='status'
        contenteditable='true'>FACE</div
      >
      <b8r-component name="dx-card-face" data-bind="value=_component_.value.back"></b8r-component>
    </div>
    <div>
      <label>
        Background Color
        <input type="color" data-bind="value=_component_.value.backgroundColor">
      </label>
    </div>
  `,
  initialValue: ({b8r, get, set}) => {
    b8r.makeComponent('dx-card-face', cardFaceComponent)
    return {
      value: {
        title: '**Test** Card',
        face: {
          active: 'Testing',
          flipped: 'Not a Test',
          top: 'DX5 to add damage on successful melee attack▶︎ Rapid Strike: 3 melee attacks at -3▷ Quick Strike: melee attack at -2',
          bottom: 'DX5 to add damage on successful melee attack▶︎ Rapid Strike: 3 melee attacks at -3▷ Quick Strike: melee attack at -2',
          left: 'Left Up',
          right: 'Right Up'
        },
        back: {
          active: 'Combat',
          flipped: 'DX',
          top: 'At start of combat, all combatants roll DX for initiative to determine the order of turns, higher goes first, ties go to players\n\n▶︎ denotes an action\n\n▷ denotes a secondary',
          bottom: 'DX is a D10 roll, where a roll of 10 is replaced by a second roll of D10+5 if that is higher, and a roll of 1 is replaced by a second roll of D10-5 if that is lower',
          left: 'Back Left',
          right: 'Back Right'
        },
        notes: [],
        backgroundColor: '#aa3333',
      },
      editFormat(evt) {
        if (evt.type === 'focus') {
          evt.target.textContent = get('value.title')
        } else {
          set('value.title', evt.target.textContent)
        }
      },
      orient(evt) {
        const {target} = evt
        if (window.getSelection) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(target);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        const card = target.closest('.card')
        if(target.matches('.right')) {
          card.style.transform = 'rotateZ(-90deg)'
        } else if (target.matches('.left')) {
          card.style.transform = 'rotateZ(90deg)'
        } else if (target.matches('.flipped, .bottom')) {
          card.style.transform = 'rotateZ(180deg)'
        } else {
          card.style.transform = 'rotateZ(0deg)'
        }
      },
    }
  },
}