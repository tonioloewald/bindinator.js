/**
# HTML5 and b8r

Every so often I discover that I've written a bunch of code that is no longer needed
because the functionality has been built into browsers. This is a *good thing* and
it's great for `b8r` because it means it can do less work!

This article was inspired by my "discovery" of the HTML5 `&lt;dialog>` element (widely
supported since 2020, so possibly older than my 
[dialog.js](?source=web-components/dialog.js) web-component).

In general, built-in HTML elements are better than web-components are better than
some random implementation of a widget. They work better, have better accessibility
support, load faster, and are more future-proof. But only if they're well-supported
on your target platform(s)!

So, I thought I'd discuss these new elements and provide working examples of their
interoperation wit `b8r` for my own edification and (hopefully) someone else's benefit.

I found this fairly nice summary of the new elements at 
[geeksforgeeks.org](https://www.geeksforgeeks.org/html5-new-tags/).

## Functional

### `<audio>` and `<video>`

For a long time, embedding audio and video content in web-pages was a huge pain in the
ass (a period of agony unnecessarily extended by the Mozilla folks refusing to support H264)
but these days you can use `<audio>` and `<video>` tags to embed references to some video
files (but they need to be correctly encoded).

Here's a very simple example, but it's worth noting that you can embed multiple media
references a single `<video>` or `<audio>` element using the `<source>` element.

    <video controls width="400px" src="test/video/submarine.mov" type="video/mp4">

<video controls width="400px" src="test/video/landscape1.mov">

See MDN for docs on [video element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
and [audio element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)

### `<canvas>`

The `<canvas>` element has been around a long time and provides extensive 2D and 3D
graphics capabilities. See [MDN Canvas API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API).

If you want to work in 3D (or very fast 2D) you probably want to use one of the
powerful WebGL libraries such as [babylonjs](https://www.babylonjs.com/) or 
[threejs](https://threejs.org/).

### `<datalist>` (autocomplete)

The `<datalist>` element implements autocomplete in linked `<input>` fields. Unfortunately,
it relies on `id` for binding, so programmatically you probably want to create a `uid` or
similar to avoid accidental cross-linking (e.g. multiple instances of a given control)

    <label for="ice-cream-choice">Choose a flavor:</label>
    <input list="ice-cream-flavors" id="ice-cream-choice" name="ice-cream-choice" />
    <datalist id="ice-cream-flavors">
      <option value="Chocolate">
      ...
    </datalist>

See MDN for docs on [datalist element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist).

<label for="ice-cream-choice">Choose a flavor:</label>
<input list="ice-cream-flavors" id="ice-cream-choice" name="ice-cream-choice" />
<datalist id="ice-cream-flavors">
  <option value="Chocolate">
  <option value="Coconut">
  <option value="Mint">
  <option value="Strawberry">
  <option value="Vanilla">
</datalist>

### `<details>` and `<summary>`

A simple implementation of progressive disclosure (used extensively in the `b8r` documentation).

    <details open>
      <summary>
        <b>topic</b>
      </summary>
      <p>
        topic is really interesting!
      </p>
    </details>

See MDN for docs on [details element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details).

<details open>
  <summary>
    <b>topic</b>
  </summary>
  <p>
    topic is really interesting!
  </p>
</details>

### `<dialog>`

The inspiration for this entire article!

In essence, a chunk of content that is, by default, hidden, until it is opened
either by adding the `open` attribute (which just shows it inline) or, better,
using the javascript `showModal` method.

```
<dialog>
  <h3>Tell me something!</h3>
  <p>
    Here's more info!
  </p>
  <label>
    <span>Info<span>
    <input>
  </label>
  <button data-event="click:_component_.ok">OK</button>
</dialog>
<button data-event="click:_component_.showModal">Show Modal</button>
<script> 
  const dialog = findOne('dialog')
  set({
    showModal() {
      dialog.showModal()
    },
    ok() {
      dialog.close()
    }
  })
</script>
```

See MDN for docs on [dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog).

### `<embed>`

The "standard" way for embedding plugins. Plugins really aren't much of a thing any more.

### <del>`<keygen>`</del>

Deprecated.

### `<meter>`

It's like a `<progress>` element but with some extra properties. Does not work properly AFAICT.
See MDN [docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter).

<label>
  Volume <meter value="7" max="11"></meter>
</label>

### `<progress>`

A progress bar.
MDN [docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress).

<progress max="100" value="50"></progress>

### `<time>`

A semantic wrapper element for a 24h time (e.g. `datetime="14:30"`), date (e.g. `datetime="2022-09-25"`),
or duration (e.g. `datetime="PT2H30M"`).


<time datetime="2022-09-25">September 25</time>

### `<wbr>`

Optional line-break.

## Semantic

Most of the new elements are basically just there to show intention and have the 
same functionality as a `&lt;div>` (or an element you just make up, like `&lt;foo>`). 
They should be used as appropriate to make styling easier and help screen-readers
and search engines, but they do not require special technical consideration nor
does it really matter if a browser "supports" them (CSS will still work, etc.).

|| HTML5 Element  || Semantic Meaning
|| `&lt;article>` | an article not necessarily related to other content on the site
|| `&lt;figure>`  | self-contained content like figures
|| `&lt;footer>`  | footer material
|| `&lt;header>`  | header material
|| `&lt;hgroup>`  | a heading group
|| `&lt;mark>`    | connotes highlighting or selection
|| `&lt;nav>`     | navigational elements
|| `&lt;output>`  | output of a computation
|| `&lt;ruby>`    | small text annotation (mainly used by Japanese publications)
|| `&lt;section>` | a section of a document


*/