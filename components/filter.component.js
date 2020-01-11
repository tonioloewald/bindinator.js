/**
# filters

```
<b8r-component path="../components/filter.component.js"></b8r-component>
```
*/

export default {
  css: `
    ._component_ {
      display: inline-block;
      box-shadow: var(--shadow-outline);
      padding: var(--narrow-spacing-size) var(--spacing-size);
      background: var(--content-bg-color);
      width: 100%;
    }

    ._component_ > select {
      min-width: 100px;
    }

    ._component_ > .tag {
      display: inline-block;
      background: var(--accent-color);
      padding: var(--input-padding-edges);
      margin: var(--narrow-spacing-size);
      border-radius: var(--rounded-radius-size);
    }

    ._component_ > .tag > button {
      margin: -4px -9px -4px 5px;
    }
  `,
  html: `
    <select>
      <option>id</option>
      <option>title</option>
    </select>
    =
    <input>
    <span class="tag">id=123<button class="icon-cross2 iconic"></button></span>
  `,
}