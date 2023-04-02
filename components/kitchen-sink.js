/**
# Kitchen Sink Demo
Copyright ©2016-2023 Tonio Loewald

The big difference between this and most web framework demos is that the majority of the
"components" are merely standard HTML widgets. The goal is not to fight the browser's
built-in functionality but *augment* it.

A number of lightweight components have been provided and "synced" to standard widgets
to show the ease with which a normal component may be swapped out for a custom component
when and if the need arises.

**Multi-window support** is demonstrated by the **spawn window** toolbar button which
launches child windows that are synced to `kitchen-sink-demo`.

<b8r-component path="../components/kitchen-sink.js"></b8r-component>
*/

export default {
  css: `
.kitchen-sink-component {
  position: relative;
  border: 1px solid rgba(0,0,0,0.25);
  background: var(--content-bg-color);
}

body {
  overflow: hidden;
}

body > .kitchen-sink-component {
  border: 0;
  background-color: var(--content-bg-color);
  display: flex;
  flex-direction: column;
}

.kitchen-sink-component .menubar-component,
.kitchen-sink-component .toolbar-component {
  flex-grow: 0;
  flex-shrink: 0;
}

.kitchen-sink-component .kitchen-sink-content {
  flex: 1 1 auto;
  overflow-y: scroll;
  overflow-y: overlay;
  padding: 8px;
}

.kitchen-sink-content > hr {
  margin: 8px -8px;
}

.video-with-still,
.video-with-still+canvas {
  width: 480px;
  height: 270px;
  object-fit: cover;
  position: relative;
}

.kitchen-sink-component label > a {
  margin-right: 8px;
}

.kitchen-sink-component .icon-eye-blocked {
  opacity: 0.5;
}

`,
  html: `
<b8r-component path="../components/menubar.js">
  <li>
    File
    <ul>
      <li>
        <a data-shortcut="ctrl-N" data-event="menuclick:kitchen-sink-demo.test">New</a>
      </li>
      <li>
        <a data-shortcut="ctrl-O" data-event="menuclick:kitchen-sink-demo.test">Open…</a>
      </li>
      <li>
        <span>Open Recent</span>
        <ul>
          <li>Recent File</li>
          <li>Another Recent File</li>
        </ul>
      </li>
      <li>
        <span data-shortcut="ctrl-S">Save</span>
      </li>
      <li>
        <a data-shortcut="ctrl-shift-S">Save As…</a>
      </li>
      <li class="separator"></li>
      <li>
        <a data-shortcut="ctrl-Q">Quit</a>
      </li>
    </ul>
  </li>
  <li>
    Edit
    <ul>
      <li>
        <a data-shortcut="meta-Z" data-event="menuclick:kitchen-sink-demo.test">Undo</a>
      </li>
      <li class="separator"></li>
      <li>
        <a data-shortcut="ctrl-X">Cut</a>
      </li>
      <li>
        <a data-shortcut="ctrl-C">Copy</a>
      </li>
      <li>
        <a data-shortcut="ctrl-V">Paste</a>
      </li>
    </ul>
  </li>
  <li>
    Format
    <ul>
      <li>
        <span>Document</span>
      </li>
      <li>
        <span>Section</span>
      </li>
      <li>
        <span>Page</span>
      </li>
      <li>
        <span>Paragraph</span>
        <ul>
          <li data-shortcut="ctrl-1">
            <b>Heading</b>
          </li>
          <li data-shortcut="ctrl-2">
            <b>Subheading</b>
          </li>
          <li>
            <span style="padding: 0 12px">Blockquote</span>
          </li>
          <li class="separator"></li>
          <li>
            <span>Body</span>
          </li>
        </ul>
      </li>
      <li>
        <span>Character</span>
        <ul>
          <li data-shortcut="ctrl-B">
            <b>Bold</b>
          </li>
          <li data-shortcut="ctrl-I">
            <i>Italic</i>
          </li>
          <li>
            <u>Underline</u>
          </li>
          <li>
            <del>Strikethrough</del>
          </li>
          <li class="separator"></li>
          <li>
            <span data-shortcut="ctrl-T">Plain</span>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</b8r-component>
<div data-component="toolbar">
  <button
    data-bind="show_if=_component_.spawn_window"
    data-event="click:_component_.spawn_window"
  >Spawn Window</button>
  <button>Test</button>
  <button>Test</button>
  <hr class="fixed">
  <button
    data-shortcut="ctrl-P"
    data-event="shortcut,click:kitchen-sink-demo.test"
  >P</button>
  <button
    data-shortcut="ctrl-B"
    data-event="shortcut,click:kitchen-sink-demo.test"
  ><b>B</b></button>
  <button
    data-shortcut="ctrl-I"
    data-event="shortcut,click:kitchen-sink-demo.test"
  ><i>I</i></button>
  <hr>
  <button>Test</button>
  <button>Test</button>
  <button>Test</button>
  <button>Test</button>
</div>
<div class="kitchen-sink-content">
  <button class="cancel">Cancel</button>
  <button>Whatever</button>
  <button class="default">Default</button>
  <hr>
  <select
    data-bind="value=kitchen-sink-demo.single_selection"
  >
    <option
      data-list="kitchen-sink-demo.multiselect:_auto_"
      data-bind="text=.text"
    >
      Item Text
    </option>
  </select>
  <br><label>
    <a href="#component=selector.component.html">
      Selector Component
    </a>
    <span
      data-component="selector"
      data-bind="value=kitchen-sink-demo.single_selection"
      style="display: inline-block; padding: 5px 10px; border: 1px solid var(--black-20);"
    >
      <span
        data-list="kitchen-sink-demo.multiselect:_auto_"
        tabindex="0"
        data-bind="text=.text"
      >
        Item Text
      </span>
    </span>
  </label>
  <br><label>
    Multi-select
    <select multiple>
      <option
        data-list="kitchen-sink-demo.multiselect:_auto_"
        data-bind="
          text=.text;
          selected=.selected
        "
      ></option>
    </select>
  </label>
  <hr>
  <label>
    <span data-component="iso-date" data-bind="value=kitchen-sink-demo.test_date"></span>
    <a href="#source=iso-date.component.html">iso-date</a> (date input wrapped with ISO-savvy component)
  </label>
  <div data-component="date" data-bind="value=kitchen-sink-demo.test_date"></div>
  <p>
    This is a fancy calendar-style <a href="#source=date.component.html">date</a> component.
  </p>
  <hr>
  <label>
    Checkbox
    <input type=checkbox data-bind="checked=kitchen-sink-demo.checked">
  </label>
  <br><label>
    Icon Toggle
    <input type=checkbox data-bind="checked=kitchen-sink-demo.checked" class="hidden">
    <span data-bind="class(icon-eye|icon-eye-blocked)=kitchen-sink-demo.checked"></span>
  </label>
  <blockquote>
    The code here is so simple, is it worth creating a component? One class hides the checkbox
    and a <code>class()</code> responds to the bound value.
  </blockquote>
  <label>
    <a href="#component=switch.component.html">Switch component</a>
    <span data-component="switch" data-bind="value=kitchen-sink-demo.checked"></span>
  </label>
  <br><label>
    <a href="#component=switch.component.html">Animated Switch (bodymovin)</a>
    <span data-component="animated-switch" data-bind="value=kitchen-sink-demo.checked"></span>
  </label>
  <hr>
  <textarea data-bind="value=kitchen-sink-demo.textarea">Text Area</textarea>
  <br><label>
    Input Field
    <input placeholder="input field" data-bind="value=kitchen-sink-demo.input_field">
  </label>
  <br><label>
    <a href="#component=input">
      Input Component
    </a>
    <span data-component="input" data-bind="value=kitchen-sink-demo.input_field"></span>
  </label>
  <br><label>
    <a href="#component=input.component.html">
      Input Component (bound using component targets)
    </a>
    <span data-component="input" data-bind="component(value)=kitchen-sink-demo.input_field"></span>
  </label>
  <br><label>
    <a href="#component=contenteditable.component.html">
      Input (contenteditable) Component
    </a>
    <div
      placeholder="contenteditable"
      data-component="contenteditable"
      data-bind="value=kitchen-sink-demo.input_field"
    ></div>
  </label>
  <br>
  <label>
    Search Field
    <span data-component="search-field"></span>
  </label>
  <hr>
  <label>
    Range Input
    <input min=0 max=25 type="range" data-bind="value=kitchen-sink-demo.fuelrods">
  </label>
  <br>
  <label>
    Number Input
    <input type="number" data-bind="value=kitchen-sink-demo.fuelrods">
  </label>
  <br>
  <label>
    <a href="#component=slider-numeric">
      slider-numeric component
    </a>
    <span
      min=0
      max=25
      data-component="slider-numeric"
      data-bind="value=kitchen-sink-demo.fuelrods"
    ></span>
  </label>
  <br>
  <label>
    &lt;b8r-component&gt; loading a slider-numeric
    <b8r-component
      name="slider-numeric"
      data-bind="value=kitchen-sink-demo.fuelrods"
    ></b8r-component>
  </label>
  <br>
  <label>
    Date
    <input type="date" value="2014-04-01">
  </label>
  <label>
    Color
    <input type="color" value="#57A700">
  </label>
  <br>
  <label>
    Progress
    <progress data-bind="attr(value)=kitchen-sink-demo.fuelrods" max="25"></progress>
  </label>
  <br>
  <form onsubmit="return false;">
    <h4>Fields with Combos / Autocomplete</h4>
    <p>
      Note that the values in these fields aren't bound so they won't sync across
      windows. It's easy enough to sync them, I just couldn't be bothered coming
      up with a bunch of properties to bind to them (laziness!).
    </p>
    <label>
      What is your name?
      <input
        style="width: 200px;"
        data-combo="names"
        data-combo-position="above"
        placeholder="match @name"
        data-event="focus,keydown,keyup:combo-controller.update"
      >
    </label><br>
    <label>
      What is your quest?
      <input
        style="width: 200px;"
        data-combo="quests"
        data-combo-position="above"
        placeholder="match whole field"
        data-event="focus,keydown,keyup:combo-controller.update"
      >
    </label><br>
    <label>
      What is the average airspeed of an unladen swallow?
      <input
        style="width: 200px;"
        data-combo="quests"
        placeholder="match whole field"
        data-event="focus,keydown,keyup:combo-controller.update"
      >
    </label><br>
    <label>
      What is your favorite color?
      <input
        style="width: 200px;"
        data-combo="colors"
        placeholder="words match colors"
        data-event="focus,keydown,keyup:combo-controller.update"
      >
    </label><br>
    <label>
      div with contenteditable="true"
      <div
        contenteditable="true"
        placeholder="match @name"
        style="width: 200px; display: inline-block;"
        data-combo="names"
        data-event="focus,keydown,keyup:combo-controller.update"
      ></div>
    </label><br>
    <label>
      div with contenteditable="true"
      <div
        contenteditable="true"
        placeholder="match field"
        style="width: 200px; display: inline-block;"
        data-combo="quests"
        data-event="focus,keydown,keyup:combo-controller.update"
      ></div>
    </label><br>
    <label>
      div with contenteditable="true"
      <div
        contenteditable="true"
        placeholder="words match colors"
        style="width: 200px; display: inline-block;"
        data-combo="colors"
        data-event="focus,keydown,keyup:combo-controller.update"
      ></div>
    </label>
    <fieldset>
      <label>
        What is your favorite color?
      </label>
      <label>
        <input
          name="favorite-color"
          value="yellow"
          type="radio"
          data-bind="value=kitchen-sink-demo.color"
        >
        Yellow
      </label>
      <label>
        <input
          name="favorite-color"
          value="blue"
          type="radio"
          data-bind="value=kitchen-sink-demo.color"
        >
        Blue
      </label>
      <label>
        <input
          name="favorite-color"
          value="pink"
          type="radio"
          data-bind="value=kitchen-sink-demo.color"
        >
        Pink
      </label>
    </fieldset>
    <label>
      <a href="#source=radioset.component.html">
        Radioset Component
      </a>
      <div
        data-component="radioset"
        data-bind="
          value=kitchen-sink-demo.color;
          component(options)=kitchen-sink-demo.colors;
        "
      ></div>
    </label>
    <button type="cancel">Cancel</button>
    <button type="submit">OK</button>
  </form>
  <div
    data-component="combo"
    data-combo-id="quests"
    class="select"
  >
    <div>My name is Sir Launcelot of Camelot</div>
    <div>To seek the Holy Grail</div>
    <div>Blue</div>
    <div>Sir Robin of Camelot</div>
    <div>What is the capital of Assyria?</div>
    <div>Sir Galahad of Camelot</div>
    <div>Blue.  No yel--</div>
    <div>It is Arthur, King of the Britons</div>
    <div>What do you mean?  An African or European swallow?</div>
  </div>
  <div
    data-component="combo"
    data-combo-id="names"
    data-combo-filter-start="@"
    data-combo-filter-split=" "
    class="select"
  >
    <div>RealArthurKingOfBritons</div>
    <div>SirLauncelot</div>
    <div>SirRobinTheNotSoBrave</div>
    <div>SirNotAppearingInThisFilm</div>
    <div>HolyHandGrenade</div>
    <div>VorpalBunny</div>
  </div>
  <div
    data-component="combo"
    data-combo-id="colors"
    data-combo-filter-split=" "
    class="select"
  >
    <div>Blue</div>
    <div>Chartreuse</div>
    <div>Lilac</div>
    <div>Pink</div>
    <div>Red</div>
    <div>Yellow</div>
  </div>
  <video
    class="video-with-still" src="test/video/landscape1.mov"
    loop="true"
    controls="true"
    data-bind="prop(currentTime)=kitchen-sink-demo.video_playhead"
    data-event="seeked,loadeddata,timeupdate:_component_.video_snapshot"
  ></video>
  <canvas></canvas>
  <blockquote>
    <b>Note</b> that the video stuff is driven mainly by \`timeupdate\` events which are
    not fine-grained for security reasons. Also, while the playhead position will be
    synced across windows, the user interface may not update correctly.
  </blockquote>
</div>
`,
  async load({component, b8r, data, get, set, on}) {
          /* global b8r, set, console */
        const {isParent, open} = await import('../lib/windows.js');
        b8r.component('../components/menubar');
        b8r.component('../components/toolbar');
        b8r.component('../components/slider-numeric');
        b8r.component('../components/combo');
        b8r.component('../components/selector');
        b8r.component('../components/input');
        b8r.component('../components/contenteditable');
        b8r.component('../components/switch');
        b8r.component('../components/animated-switch');
        b8r.component('../components/radioset');
        b8r.component('../components/search-field');
        b8r.component('../components/date');
        b8r.component('../components/iso-date');
        ['seeked', 'loadeddata', 'timeupdate'].forEach(b8r.implicitlyHandleEventsOfType);
        const video_snapshot = evt => {
          const video = evt.target;
          const canvas = evt.target.nextElementSibling;
          const dw = canvas.offsetWidth;
          const dh = canvas.offsetHeight;
          canvas.setAttribute('width', dw);
          canvas.setAttribute('height', dh);
          const ctx = canvas.getContext('2d');
          const sw = video.videoWidth;
          const sh = video.videoHeight;
          // ctx.drawImage(video, 0, 0, sw, sh, 0, 0, dw, dh);
          ctx.drawImage(video, 0, 0, sw, sh, 0, 0, dw * 0.5, dh * 0.5);
          ctx.drawImage(video, 0, 0, sw, sh, dw * 0.5, 0, dw * 0.5, dh * 0.5);
          ctx.drawImage(video, 0, 0, sw, sh, 0, dh * 0.5, dw * 0.5, dh * 0.5);
          ctx.drawImage(video, 0, 0, sw, sh, dw * 0.5, dh * 0.5, dw * 0.5, dh * 0.5);
        };
        b8r.onAny(['timeupdate'], '_b8r_._update_');
        // multi-window support, see windows.js
        if (isParent()) {
          const spawn_window = () => {
            open(
              window.location.href.split('#')[0] + '#body=components/kitchen-sink',
              { minWidth: 600, minHeight: 400 },
              ['kitchen-sink-demo']
            );
          };
          // we only want the parent to be able to spawn new child windows
          set({video_snapshot, spawn_window});
          // create a fake dataset once for everyone to share
          b8r.reg['kitchen-sink-demo'] = {
            fuelrods: 17,
            single_selection: 'Another Option',
            input_field: 'edit this text',
            checked: true,
            textarea: 'this is a text\narea',
            test_date: '1976-04-01T08:00:00.000Z',
            multiselect: [
              {
                text: 'Default',
                selected: false
              },
              {
                text: 'Another Option',
                selected: true
              },
              {
                text: 'Yet Another Option',
                selected: false
              },
              {
                text: 'And Yet Another Option',
                selected: true
              },
            ],
            colors: [
              {text: 'Yellow', value: 'yellow'},
              {text: 'Pink', value: 'pink'},
              {text: 'Blue', value: 'blue'},
            ],
            color: 'pink',
            test: evt => {
              console.log('menu pick', evt.target.textContent);
              return true;
            },
            video_playhead: 0,
          };
        } else {
          set({video_snapshot});
          if (! b8r.reg['kitchen-sink-demo']) {
            b8r.reg['kitchen-sink-demo'] = {};
          }
        }
  }
}