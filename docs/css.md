# cascading style sheets

Managing CSS is a serious problem with most complex web applications. `b8r` was designed, from the
start, to make scoping CSS rules easy and (nearly) foolproof.

### Global Rules & Component Rules

The `b8r` approach to CSS is intended to be conceptually simple and robust.  In essence, you should have 
global rules and component-level rules.

### Web-Components

One of the nice things about web-components is that they all have custom tagNames. This means they provide
a unique top-level namespace for styling (i.e. `<foo-bar>` can be styled using `foo-bar` as a selector,
without overriding any classes).

### Automatic Classes & Scope

If you create a component named `foo` it will automatically have the class `foo-component`. You can
write CSS rules inside the component accordingly.

If you're rigorous about using the component's automatic class in every css rule that is intended to be
scoped to a component, there should be no leakage. (In practice, this is overkill and you can be more
relaxed about about selectors, and tighten up rules — e.g. using `>` judiciously — only in a small number
of cases.)

#### `_component_`

`b8r` also supports the use of `_component_` inside css rules and HTML (e.g. `<div class="_component_">`
or `<h2 class="_component_-heading">`) which will automatically be  replaced with 
`<component-name>-component` when the component is loaded. This allows for changing the component's
name after initially writing it _and_ loading a component with a name other than the default (e.g. if
you're using components from two different libraries that happen to have the same name).

This isn't perfect, of course! In particular, when you nest components, it follows that if `foo` contains 
`bar` that `.foo-component` rules may leak into `bar`. Thus, it is often useful to carefully scope your 
CSS rules based on hierarchy and use `_component_` inside longer class names for added specificity, 
e.g. `_component > h1` or `_component_-heading`.

### css-variables

If you don't know about css-variables you need to stop what you're doing and 
[read up how to use CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables)
right now.

`b8r.css` makes extensive use of css-variables (so look there for some examples) and [dom.js](?source=source/dom.js)
provides `cssVar()` for conveniently setting and getting `:root` css variables. If you want to do common things
like support color themes (e.g. 'dark mode') or globally toggle visible focus, css-variables are 
a very efficient way to do it.

Using `cssVar()` you can also easily communicate theme settings to web-components (e.g. allow global theme
settings to change the rendering of different custom-element's shadow-DOMs).

### Themes and "Dark Mode"

If you want to see the power (and grace) of css-variables, you should look at the
[Theme Editor](?source=theme-editor.component.html) component, and at how
__Dark Mode__ is implemented in `b8r.css`. (And, assuming you can, try switching between
normal and dark mode while you have the page open.)

### Less.js, Sass, etc.

`b8r` makes _no allowances_ for css pre-processors right now (even though doing so would be easy). 

Having extensive experience with `less` in a past life, it seems that these tools create more problems 
than they solve, especially with the advent of 
[CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables) 
(which can be viewed and manipulated  at run-time). 

I strongly recommend that you **use CSS variables and avoid CSS pre-processors**.