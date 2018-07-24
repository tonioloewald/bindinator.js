# css

Managing CSS is a serious problem with most complex web applications.

### Global Rules & Component Rules

The `b8r` approach to CSS is intended to be conceptually simple and robust.  In essence, you should have 
global rules and component-level rules.

### Automatic Classes

If you create a component named `foo` it will automatically have the class `foo-component`. You can
write CSS rules inside the component accordingly.

### `_component_`

`b8r` also supports the use of `_component_` inside css rules and HTML classes which will automatically be 
replaced with `<component-name>-component` when the component is loaded. This allows for changing the component's
name after initially writing it _and_ loading a component with a name other than the default (e.g. if
you're using components from two different libraries that happen to have the same name).

### Managing Scope

This isn't perfect, of course! (No CSS management strategy seems to be.) In particular, when you
nest components, it follows that if `foo` contains `bar` that `.foo-component` rules may leak into
`bar`. Thus, it is often useful to carefully scope your CSS rules based on hierarchy and use
`_component_` inside longer class names for added specificity, e.g. `_component > h1` or `_component_-heading`.

### Less.js, Sass, etc.

`b8r` makes _no allowances_ for css pre-processors right now (even though doing so would be easy). 

Having extensive experience with `less` in a past life, it seems that these tools create more problems 
than they solve, especially with the advent of [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables) 
(which can be viewed and manipulated  at run-time). 

I strongly recommend using CSS variables and avoiding CSS pre-processors.