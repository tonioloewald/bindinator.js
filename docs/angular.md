# Angular vs. b8r

> #### Caution
>
> I'm still getting to grips with Angular.
> About 75% of the time when I describe `b8r` or point someone at the docs
> they'll say "oh, it looks like Angular". I think there are superficial
> similarities, but `b8r` seems to me to be much simpler, use far less
> boilerplate, and not involve learning an ill-defined superset of
> HTML and another of Typescript.

## Yet More DSLs

- write templates in Angular's template language (they say it's HTML
  but this is *just not true*. `*ngFor` is not a legitimate attribute.)
- write your code in Angular's version of Typescript. (`@Component`!)

To be a good web-developer you need to be proficient in HTML, CSS, and
Javascript (or some language that gets transpiled into Javascript). 
Having to code in other DSLs (domain-specific languages) means needing
to learn even more languages (*nothing will save you* from needing to 
understand HTML, CSS, etc.) and then understand both the source code
and the output, and tie the second to the first.

With `b8r` you just write regular Javascript, HTML, and CSS. No tooling or
transpilation is required. Angular, like React, leans heavily on tooling 
and "magic at a distance".

Now, if you view HTML, CSS, and Javascript as the "assembly language of
the web" then there'd be a strong argument for an abstraction layer
that allows more expressive or platform-abstracting code than assembler,
after all, almost no applications are written in assembler these days for
good reasons. Such things exist, e.g. [Cappucino](https://www.cappuccino.dev/) 
was designed to essentially allow you to build web apps without ever looking 
at HTML or CSS, and just to write your code in Objective-J.

But as we have seen `b8r` is actually *more compact and
expressive*, and no less platform-abstracting than React or Angular 
(or Cappucino).

React claims to be "just javascript" when it isn't. Angular not only requires
you to code in Typescript, it isn't even "just Typescript". It creates 
components that "look" like custom elements (but aren't) and requires you 
to mark up your files with "decorators" that don't look like anything, and 
coding Angular often [feels more like Java than Javascript](http://codeofrob.com/entries/you-have-ruined-javascript.html).

## Not Quite HTML

You can kind of puzzle out what this does, but it smells like a whole
new toy programming language *and* a templating language. And a pretty nasty
templating language at that.

    <div *ngFor="let product of products; trackBy trackUuid">
      <h3>
        {{ product.name }}
      </h3>
      <button (click)="addToCart()">
        Add to Cart
      </button>
    </div>

Why not `const product of products`? Why does `ngFor` need a `*`? Is
`trackUuid` a function or a property? Why is `product.name` ok but `addToCard`
needs `()`? What happens if you omit the `()`? Why `(click)`?

vs:

    <div data-list="path.to.products:uuid">
      <h3 data-bind="text=.name"></h3>
      <button data-event="click:_component_.addToCart">
        Add to Cart
      </button>
    </div>

> By the way, I would *love* to make `b8r`'s syntax cleaner
> by not forcing the user to write `data-bind="value=path.to.bar"`
> and instead (say) `value=path.to.bar` but if the price is needing
> to invent a new language that needs to be transpiled
> I choose *technical* simplicity and *correctness*.
>
> If I had developed `b8r` at a company with the resources of Google or
> Facebook, I might have been tempted to make it much more internally
> complex, but my goal would be to make the syntax *simpler* and *cleaner*.

The `b8r` example is simply HTML because `b8r` templates are just HTML. Really.

It's going to be parsed and rendered by the browser using its *native* HTML 
parsing pipeline. The Angular code is some kind of templating language that's 
going to be parsed and rendered using Javascript code (or, if you're lucky, 
WebAssembly) that the client will have to download, load into RAM, and run.

`b8r`'s bindings do have a simple syntax, but it's designed to be almost
self-explanatory, and experience has shown that programmers completely new
to `b8r` can read its bindings and grok what they do (although it can take
a few visits to the documentation to understand *how to write* some of the
more exotic bindings).

Oh, and `b8r`'s bindings are attributes that show up in the DOM and help
you debug using the browser's native debugging tools.

Angular template:

    <button (click)="share()">
      Share
    </button>

    <ng-container *ngFor="let product of products; trackBy trackFn">
      <app-product-alerts
        [product]="product">
      </app-product-alerts>
    </ng-container>

    <input [(value)]="name">

- You'll need to implement `trackFn` inside the component class. 
- You'll need to define the `products` array in the component class, 
  whether that makes any sense or not.
- Don't forget to put parentheses after a function in an event handler,
  or your code will lint and run but not work.
- If you're not familiar with Angular, try to figure out what the rules
  are for the syntax allowed inside `" ... "`, or `{{ ... }}`, how `*ngFor`
  works, or what the semantics of `( ... )`, `[ ... ]`, and `[( ... )]`
  are. Why is it `trackFn` and `share()`? If you are, try to explain 
  them simply. Then give that explanation to the Angular team... please!

> **Note**: while I dislike the microDSLs that Angular proliferates
> (e.g. in `ngFor` bodies, or pipes), it occurs to me that for nested lists, the
> `ngFor="let foo of fooList"` syntax lets an inner element refer
> to an ancestral property in a way that isn't as easy in `b8r`. (This
> hasn't ever been a problem for me, or I'd have fixed it.)
>
> Thinking about this did inspire me to finally implement implicit
> method bindings, so you can write `data-bind="path.to.method=path.to.value"`
> instead of `data-bind="method(path.to.method)=path.to.value"`. I think
> this simplification makes method bindings much more "first class" and 
> eliminates any temptation I feel to add something like Angular's "pipes" or
> complicate `b8r`'s bindings in any other way.

Let's look at `b8r` HTML:

    <button data-event="click:path.to.share">
      Share
    </button>

    <b8r-component
      data-list="path.to.products:id"
      name="product-alert" 
      data-bind="component(product)=.">
    </b8r-component>

    <input data-bind="value=.name">

- `products` is in exactly *one* place in the registry. You don't
  pass references to it around from parent to child.

Of course, `b8r` supports web-components too, so you could also do:

    <app-product-alerts
      data-list="path.to.products:id"
      data-bind="prop(product)=."
    >
    </app-product-alerts>

Note that the `b8r` snippets are self-contained. The Angular examples need supporting 
logic in the surrounding code. They're just the "template" piece.

## Not Quite Typescript

    import { Component, OnInit } from '@angular/core';

    @Component({
      selector: 'app-product-alerts',
      templateUrl: './product-alerts.component.html',
      styleUrls: ['./product-alerts.component.css']
    })
    export class ProductAlertsComponent implements OnInit {
      constructor() { }

      ngOnInit() {
      }

    }

By the looks of things, a simple component can easily end up being four different
source files.

Also, on top of needing to learn and read Angular's template syntax inside
your HTMLish code, you now need to code in some kind of weird declarative
syntax (`@Component`, `@Input`) in your source files.

## Obfuscation and Efficiency

A major practical difference between Angular and `b8r` is that the
latter is *not* designed to live inside and rely on a complex build system 
which compiles your "HTML" into Javascript which can then be obfuscated.
If you want to obfuscate your code, `b8r` is going to be a problem.

This runs deep. Google's entire stack (of which Angular is
a piece) supports obfuscation from end-to-end (e.g. protobuf code 
compiles query requests and responses down to arrays with no labels, 
unlike GraphQL which uses plaintext labels for queries and returns 
vanilla JSON). This saves bandwidth (and gives you a little
"security by obscurity").

`b8r` simply won't obfuscate the DOM or your data structures (the
registry is really easy to understand — a huge advantage during
development and debugging).

Of course, nothing is stopping you using protobuf over the wire
for the performance win, and obfuscation (including minification)
will give you little or no advantage for gzipped code (and `b8r` 
code will typically be far smaller than Angular.)

## Angular makes dynamic stuff hard

Want to create a component on-the-fly in `b8r`?

    b8r.makeComponent('foo', {
      css: '._component_  { position: absolute; top: 0; right: 0} ',
      html: '<div>foo</div>'
    })

(If this seems *just like* how you'd make a component in a javascript
library, that's because it is.)

Want to stick it in the DOM?

    b8r.insertComponent('foo');

What if you dynamically add the tag to the DOM?

    const foo = document.createElement('b8r-component')
    foo.name = 'foo'
    document.body.append(foo)

It. just. works.

What happens if you do the second thing first and the first thing second?
It still works.

Want to do the same thing in Angular? Well you *could* try to wrap your Angular component as
a web-component using `@angular/elements` but 
[that's kind of super hard](https://angular.io/guide/elements#transforming-components-to-custom-elements),
or you could try using a `PortalComponent` but the 
[example in the documentation](https://material.angular.io/cdk/portal/overview)
swaps *statically defined* elements.

Want to create a component on-the-fly in Angular? Just figure out 
[the documentaton](https://angular.io/guide/dynamic-component-loader).
Or maybe read one of the many Medium articles that try to explain said API, e.g.

- [Dynamically Creating Components with Angular](https://netbasal.com/dynamically-creating-components-with-angular-a7346f4a982d)
- [How to Dynamically Create a Component in Angular](https://dzone.com/articles/how-to-dynamically-create-a-component-in-angular)

By the way, I couldn't get these approaches to work.

## So. Many. &lt;!----&gt;s.

The Angular documentation argues that `ngIf` is justified because it's cheaper in
resources to exclude DOM elements that aren't needed and put them in when they
are. This manifests in HTML comments appearing *everywhere* in the DOM as placeholders. 
(I assume the Angular runtime has to keep links to them to know where to put the 
conditional elements when needed.)

Weirdly, `b8r` manages to handle dynamically updated, filtered lists without any of
this nonsense.

The key takeaway is that if you have a tiny list, e.g. 0 or 5 elements, `b8r` will
have **one** extra instance of the list (hidden) in the DOM. On the other hand if you
have giant filtered list with bazillions of unfiltered elements but only n showing,
`b8r` will have n in the DOM (+1 hidden), while Angular will have bazillions of
comments, and n in the DOM.

Oh, and if you reorder the list, `b8r` will reorder the visible elements, and Angular
will reorder the comments.

**Here's the problem**: comments aren't free either.

1. It's highly debatable whether a non-rendered DOM element is more expensive than a 
   comment + the code necessary to conditionally render the element + the book-keeping 
   necessary to keep the two things in sync,
2. Comments are DOM nodes that slow down CSS selectors, etc.
3. It seems apparent from looking at Angular apps that the perception that `ngIf` is
   "free" leads to some very bad practices. Imagine a table with 1M rows filtered by
   setting `ngIf`.

## Angular paves the wrong paths

The default method of binding in Angular is automatic, once you wrap your
head around its various weird syntaxes:

- `[(foo)]="inline javascript in quotation marks | with | pipes"`
- `*ngWhatever="I'm not quite sure exactly what can go here`

But it turns out that the default "Change Detection strategy" (Angular is full
of idiosyncratic terminology) is not performant so you're steered towards `RxJs`
(or `ngRx`, which is Angular's version and not quite the same) and `changeDetection.onPush`
which requires you to label class properties with `@Input` directives (or decorators or
whatever they're called).

It turns out `onPush` isn't great either (kind of the way React manages not to be very
good at not needlessly redrawing static DOM nodes despite maintaining a "virtual DOM").

## It's Big and Complicated

Angular's ["cheat sheet" is more lke a novel](https://angular.io/guide/cheatsheet).

## Verbosity

The first, long Angular tutorial doesn't actually do anything, and yet takes more code
and explanation than the React *To Do* tutorial (which at least does something).

To its credit, the Angular tutorial goes on to take you through constructing
services and adding some "real" functionality for the Shopping Cart example.
The tutorial, however, seems very long and tedious for the amount of actual
functionality delivered.

Even so, I don't think this makes up for Angular's many annoyances, and the toy
functionality Angular walks you through isn't anything useful. You're
better off cleanly separating services from UI and using a back-end platform
like [Firebase](./?source=components/firebase.component.js) 
or [FaunaDB](https://fauna.com/) anyway.
