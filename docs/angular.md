# Angular vs. b8r

A lot of the coders I've shown `b8r` to say something like "it looks a
lot like Angular" (which I think they often [intend as an insult](http://codeofrob.com/entries/you-have-ruined-javascript.html)).
While `b8r` may bear some superficial similarity to `Angular` in that it uses HTML
"properties" to bind your `model` to the DOM, that's almost entirely coincidental, 
and where the similarity ends.

## Here's an overview of the differences:

| Feature          | Angular2           | b8r
|--|--|--
| data binding     | [style.width.px]="publicProperty" | data-bind="style(width&#124;px)=path.to.property"
| two-way binding | [(publicProperty)]="publicProperty" | data-bind="value=path.to.property"
| event binding    | (click)="publicMethod()"          | data-event="click:path.to.method"
| array binding    | *ngFor="let foo of foos"         | data-list="path.to.array"
| efficient array binding | *ngFor="let foo of foos; trackBy: getId"<br>You'll need to implement getId, much like generating a key in React | data-list="path.to.array:id"<br> if id is unique property of each element
| array element binding | [something]="foo.prop"       | data-bind=".prop"
| conditional element | *ngIf="booleanVar == true"    | data-bind="show_if=path.to.booleanVar"
| component lifecycle | ngOnChanges, ngOnInit, ngDoCheck, ngAfterContentInit, ngAfterContentChecked, ngAfterViewInit, ngAfterViewChecked, ngOnDestroy | initialValue, load, destroy
| intercept property changes | use a setter | use a setter
| handle real-time data | use RxJs observeable and async pipe | use b8r.set() or b8r.touch()
| subscribe to property changes | use a setter | b8r.observe('path.to.observed', 'path.to.callback')
| what does conditional `&lt;div>...&lt;/div>` look like, if condition not met? | `&lt;!-- -->` | `&lt;div style="display: none">...&lt;/div>`
| reference child element within component | @ViewChild('foo')<br>foo: ElementRef;<br>// available after view initialized | findOne('.foo')
| access DOM | this.elementRef.nativeElement // discouraged | findOne('.foo') is an HTMLElement
| change detection | default is horribly slow so use ChangeDetectionStrategy.onPush and mark properties as @Input() | use b8r.set() or b8r.touch()
| detect changes outside Angular | need reference to NgZone and then perform changes inside ngZone.runOutsideAngular()<br>If this doesn't work, call this.changeDetector.detectChanges() in the affected component(s) | use b8r.set() or b8r.touch()
| detect change within object property | replace the object with a shallow clone | use b8r.set() or b8r.touch()
| language | TypeScript | Javascript
| DSLs | templating language<br>"structural directives": &ast;ngFor, &ast;ngIf, etc. each have a "micro syntax" and themselves form an extensible micro-syntax that has control and loop structures; an uncharitable person might suggest it's a bit like .jsp | data-bind, data-list, and data-event each have a very simple syntax
| requires build/compile/transpile | yes | no
| supports deep obfuscation | yes | no
| components use shadow DOM | yes (by default) | no

Then there are the deeper differences...

## Angular's Change Detection is a Weird and Complicated

To implement change detection, Angular overrides core DOM methods such as
addEventListener() and setTimeout(). `b8r` does no such thing.

Angular tries to detect changes to your model and update the rendered
view automagically, but the cases in which it fails are hardly "rare
edge cases". Also, originally Angular handled anything it thought might
be a change by re-rendering the entire DOM, which was _slow_. This
is `ChangeDetectionStrategy.default` and using it is generally considered
bad practice.

(Which gets us to another issue with Angular. There's too many ways
to do anything and the common or default way is often the bad way.)

So, we're now strongly encouraged to override this with `ChangeDetectionStrategy.onPush`
which requires you to flag component properties as `@Input` so that
...magic happens and... when the property changes, the component gets
re-rendered. Except that if a property is an object it may miss changes
inside objects, so you're required to follow the React anti-pattern
of shallow-cloning everything all the time: `foo = {...foo, myNewValue}`
(or using `immutable.js`) and this of course adds complexity and
can trigger over-rendering.

But if you want to touch properties in vanilla javascript (e.g. using
a library of async functions) then all this doesn't work at all, and
you need to obtain a reference to an `NgZone` (which is a magical
context in which change detection occurs) by magically obtaining it
via your component's `constructor()` and then wrap the thing in an
`ngZone.runOutsideOfAngular()` call.

All of this is so complicated that there are, of course, lots of 
[Medium articles](https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/),
blog posts, and Stack Overflow answers that attempt to explain it
at length.

## `b8r`'s change detection is simple and robust

Here is how `b8r` manages change.

`b8r.register('name', object)` registers an object as having the specified
name. You can refer to properties anywhere in the object unambiguously
using paths.

`b8r.get('path.to.value')` returns the value at the path (or null if nothing
is there).

`b8r.set('path.to.value', newValue)` updates the registered object and
queues anything bound to the path to be updated.

`b8r.touch('path.to.value')` flags anything bound to the path to be updated
(if, for example, you changed it directly).

The most complicated aspect of all this is paths to items in arrays,
because there's more than one way to refer to an element in an array
with a path. It follows you should only refer to items in a specific
array using one approach in bindings (and `b8r` will warn you if you
use more than one approach).

## Angular is hard to Google (ironically)

Because "angular" is a word in common use AND can refer to one of two
markedly different versions of Angular it can be very hard to google
stuff on Angular, and you often run into articles where you get advice f
or the wrong version. Oops.

Worse, the quality of both the Angular documentation and the numerous
blog posts "explaining" bread-and-butter topics are wildly uneven in quality
and often contradictory (combine this with the confusion between Angular and
Angular2).

## Learning Angular teaches you Angular

If you work with Angular, you're going to need to learn some new DSLs
(domain-specific languages). E.g. you'll need to:

- write templates in Angular's template language (they say it's HTML
  but this is *just not true*. `*ngFor` is not a valid attribute.)
- write your code in Angular's version of Typescript. (`@Component`!)
- understand "structural directives" and their associated syntaxes.

## `b8r` leverages knowledge you either already have or will need anyway

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

(Incidentally: why not `const product of products`? Why does `ngFor` need a `*`?
Is `trackUuid` a function or a property? Why is `product.name` ok but `addToCard`
needs `()`? What happens if you omit the `()`? Why `(click)`?)

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
  are. Why is it `trackFn` and `share()`? And, if you are familiar with
  Angular, please try to explain them simply. Then give that explanation 
  to the Angular team... please!

> **Note**: while I dislike the microDSLs that Angular proliferates
> (e.g. in `ngFor` bodies, or pipes), it occurs to me that for nested lists, the
> `ngFor="let foo of fooList"` syntax lets an inner element refer
> to an ancestral property in a way that isn't as easy in `b8r`. (This
> hasn't ever been a problem for me, or I'd have fixed it, but it is 
> interesting.)
>
> Thinking about this did inspire me to finally implement *implicit
> method bindings*, so you can write 
> `data-bind="path.to.method=path.to.param1,path.to.param2"`
> instead of 
> `data-bind="method(path.to.method)=path.to.param1,path.to.param2"`. I think
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

    <app-product-alert
      data-list="path.to.products:id"
      data-bind="prop(product)=."
    >
    </app-product-alert>

Note that the `b8r` snippets are self-contained (aside from not defining
the internals of the product-alert component). The Angular examples need 
supporting logic in the surrounding code, even if the product array and
the share method already exist. They're *just* the "template" piece.

To put it even more starkly: there is nothing code-like in the `b8r`
template (e.g. `share()` or `let product of products`) yet it does *everything 
it has to*. The Angular template has code embedded in the HTML and yet 
requires more code elsewhere (without a supporting `class` with `products`
and `share` properties, it doesn't do anything (except throw errors).

> Every line of code you don't have to write takes no time, costs nothing
> to store, lints perfectly, doesn't need to be reviewed, causes no errors, 
> requires no tests, and doesn't need to be read and grokked by someone later.

## Not Quite Typescript

Angular makes extensive use of [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).
It's up to you to decide whether you like this (and, love it or hate it,
it's something that may change in future).

    import { Component, OnInit } from '@angular/core';

    @Component({
      selector: 'app-product-alerts',
      templateUrl: './product-alerts.component.html',
      styleUrls: ['./product-alerts.component.css']
    })
    export class ProductAlertsComponent implements OnInit {
      @Input() value: string = '';
      constructor() { }
      ngOnInit() {
      }
    }

These decorators are, effectively, a DSL which you'll need to learn.
(You can probably guess whether I like this.) Typically they're
described in "cookbook" fashion rather than in terms of how they
work and what they do. So you'll often find yourself debugging code
you didn't write with no clue what it's doing or what it's supposed
to do.

`@Input` is doing something like wrapping the value assigned to the
property in an observable and then when the value changes updating the
property and marking the object as "dirty" so it gets redrawn. Again,
what a given decorator does is pretty arbitrary so it's a bunch of 
special case voodoo you just need to learn.

By contrast, `b8r` thinks in terms of "paths" so when it sees that a
value at a path has changed, it knows to redraw anything bound to
that path. That seems a lot simpler to explain and grok.
## Lots of Files

A simple component can easily end up being *four different source files*. (This
has the advantage of better leveraging code quality tools than `b8r`'s single
file approach. I may add it as an option in future, but it will then require
transpilation.) There will likely be 1-3 extra files for each subcomponent, 
and in many cases you'll find you need to create subcomponents where you 
wouldn't need to in `b8r`.

## Obfuscation and Efficiency

A major practical difference between Angular and `b8r` is that the
latter is *not* designed to live inside and rely on a complex build system 
which compiles your "HTML" into Javascript which can then be obfuscated.
So, if you want to obfuscate your code, `b8r` is going to be a problem.

This runs deep. Google's entire stack (of which Angular is
a piece) supports obfuscation from end-to-end (e.g. protobuf code 
compiles query requests and responses down to arrays with no labels, 
unlike GraphQL which uses plaintext labels for queries and returns 
vanilla JSON). This saves bandwidth (and gives you a little
"security by obscurity"), although gzip more-or-less eliminates the bandwidth
difference.

`b8r` simply won't obfuscate the DOM or your data structures (the
registry is really easy to understand — a huge advantage during
development and debugging, but maybe a problem when trying to deal
with bad actors).

Of course, nothing is stopping you using protobuf over the wire
for the performance win, and obfuscation (including minification)
will give you little or no advantage for gzipped code, and `b8r` 
code will typically be far smaller than Angular because of all
the glue and dom-rendering code you don't end up writing, compiling,
and packaging). 

Also, `b8r` supports non-blocking, lazy-loading all 
the way down so even if it weren't smaller and faster you wouldn't
care so much. But, if you're determined to package your application
as a single giant javascript file—minified, obfuscated, and 
gzipped, breaking caching whenever any code in your tree is
changed anywhere—then that advantage is irrelevant to you.

## Angular makes dynamic stuff hard

Want to create a component on-the-fly in `b8r`?

    b8r.makeComponent('foo', {
      css: '._component_  { position: absolute; top: 0; right: 0} ',
      html: '<div>foo</div>'
    })

(If this seems *just like* how you'd make a component in a javascript
library, that's because it is.)

Want to stick it in the DOM?

    b8r.insertComponent('foo', containingElement);

What if you dynamically add the tag to the DOM?

    const foo = document.createElement('b8r-component')
    foo.name = 'foo'
    document.body.append(foo)

It. just. works.

What happens if you do the second thing first and the first thing second?
What if you do the first thing. Wait a random amount of time. Then do the second?
Or the other way around. Or accidentally do one of them twice?!

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

By the way, I couldn't really understand these approaches or get them to work.

## So. Many. &lt;!-- comment --&gt;s.

The Angular documentation argues that `ngIf` is justified because it's cheaper in
resources to exclude DOM elements that aren't needed and put them in when they
are. (Versus, say, putting them in and hiding/showing them—the `b8r` way.)
This manifests in HTML comments appearing *everywhere* in the DOM as placeholders. 
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
   "free" leads to some very bad practices. E.g. (as above) tables with many rows filtered by
   setting `ngIf`.

## It's Big and Complicated

Angular's ["cheat sheet" is more lke a novel](https://angular.io/guide/cheatsheet).
If it's this complex to summarize…

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
