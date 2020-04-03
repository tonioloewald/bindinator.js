# Angular vs. b8r

> ### Caution
> I'm a relative newb to Angular so I'm probably missing stuff.
> At this point I'm pretty sure that I'm not saying anything nasty
> about Angular that isn't true, it's just that there's nastier
> stuff I haven't found out.

## Yet More DSLs

To be a good web-developer you need to be proficient in HTML, CSS, and
Javascript (or some language that gets transpiled into Javascript). 
Having to code in other DSLs (domain-specific languages) means needing
to learn even more languages (nothing will save you from needing to 
understand HTML, CSS, etc.) and then understand both the source code
and the output, and tie the second to the first.

With `b8r` you just write regular Javascript, HTML, and CSS. No tooling or
transpilation is required. Angular, even more than React, leans heavily on 
transpilation (e.g. you must use TypeScript) and "magic at a distance".

Now, if you view HTML, CSS, and Javascript as the "assembly language of
the web" then there'd be a strong argument for an abstraction layer
that allows more expressive or platform-abstracting code than assembler.
After all, almost no applications are written in assembler these days for
good reasons. But as we have seen `b8r` is actually *more compact and
expressive*, and no less platform-abstracting than React, and it's somewhat
leaner than Angular (although perhaps the advantage is not as marked).

## Not Quite HTML

You can kind of puzzle out what this does, but it smells like a whole
new programming language *and* a templating language.

    <div *ngFor="let product of products">
      <h3>
        {{ product.name }}
      </h3>
      <input type="number" [(value)]="product.quantity">
    </div>

vs:

    <div data-list="path.to.products:uuid">
      <h3 data-bind="text=.name"></h3>
      <input data-bind="value=.quantity">
    </div>

The `b8r` example is simply HTML. It's going to be parsed and rendered by
the browser using its native HTML parsing pipeline. The Angular code is some
kind of templating language that's going to be parsed and rendered using
Javascript code (or, if you're lucky, WebAssembly) that the client will have to
download, load into RAM, and run.

`b8r`'s bindings do have a simple syntax, but it's designed to be almost
self-explanatory, and experience has shown that programmers completely new
to `b8r` can read b8r bindings and grok what they do (although it can take
a few visits to the documentation to understand how to write some of the
more exotic bindings).

Oh, and `b8r`'s bindings are attributes that show up in the DOM and help
you debug using the browser's native debugging tools.

    <button (click)="share()">
      Share
    </button>

    <app-product-alerts
      [product]="product">
    </app-product-alerts>

vs:

    <button data-event="click:path.to.share">
      Share
    </button>

    // I'm assuming that the second block is essentially invoking a component
    <b8r-component name="product-alert" data-bind="component(product)=path.to.product">
    </b8r-component>

Of course, `b8r` supports web-components too, so you could also do:

    <app-product-alerts data-bind="prop(product)=path.to.product">
    </app-product-alerts>

Note that the `b8r` snippets are self-contained. The Angular examples need supporting 
logic in the surrounding code.

## Not Quite Javascript

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

You can inline all this stuff using template strings (as with b8r). But you will
need to transpile it.

Also, on top of needing to learn and read Angular's template syntax inside
your HTMLish code, you now need to code in some kind of jsx-like declarative
syntax in your source files.

## The Easy Way should be the Right Way

`b8r`'s default method of binding things is its **only** method of binding things.
It's fast, efficient, and powerful. Angular now wants you to use its **onPush**
change strategy because its default binding system is, to be blunt, terrible.

But **onPush** requires you to override default settings and add `@Input()` decorators
and on and on. `b8r` just works.

## Dynamic should Easy

Want to insert `b8r` stuff on the fly? It's easy because **it's just HTML**. Want to
do the same thing in Angular? Well you could try to wrap your Angular component as
a web-component using `@angular/elements` but 
[that's kind of super hard](https://angular.io/guide/elements#transforming-components-to-custom-elements),
or you could try using a `PortalComponent` but the 
[example in the documentation](https://material.angular.io/cdk/portal/overview)
swaps *statically defined* elements.

If you want to add a component to the DOM dynamically with `b8r`:

    b8r.insertComponent('componentName', targetElement)

If the component isn't already loaded, you'd need to load it first.
Or later. And, under the hood, all it's doing is what you'd do to the
HTML because *it's just HTML*. So you could do:

    b8r.targetElement.dataset.component = 'componentName'
    b8r.bindAll(targetElement)

I guess that probably wouldn't get many claps on Medium.

## So. Many. Comments.

The Angular documentation argues that `ngIf` is justified because it's cheaper in
resources to exclude DOM elements that aren't needed and put them in when they
are. This manifests in HTML comments (`<!---->` in production code) appearing everywhere 
in the DOM as bookmarks. (I assume the Angular runtime has to keep links to them to
know where to put the conditional elements when needed.)

**Here's the problem**: comments aren't free either.

1. It's highly debatable whether a non-rendered DOM element is more expensive than a 
   comment + the code necessary to conditionally render the element + the book-keeping 
   necessary to keep the two things in sync,
2. Comments are DOM nodes that slow down CSS selectors, etc.
3. It seems apparent from looking at Angular apps that the perception that `ngIf` is
   "free" leads to some very bad practices. Imagine a table with 1M rows filtered by
   setting `ngIf`.

## Documentation

The first, long Angular tutorial doesn't actually do anything, and yet takes more code
and explanation than the React *To Do* tutorial (which at least does something).

To its credit, the Angular tutorial goes on to take you through constructing
services and adding some "real" functionality for the example Shopping Cart.
The tutorial, however, seems very long and tedious for the amount of actual
functionality delivered.

This isn't a technical flaw in Angular, but it's still annoying:

There's a lot of documentation on Angular, which is great, but there are two completely 
different and incompatible "versions" of Angular which are difficult to search for. The 
original Angular ("AngularJS"), now in version 4, is now deprecated by Google. 
Angular 2 — yes really — ("Angular|TS"), now in version 7, is a different beast. 
The amount of time one wastes trying to filter out noise in searches is insane.

In my experience thus far, every major concept of Angular is hard to understand, but
that's OK, there are twenty Medium articles on it that are also hard to understand.

*To be continued…*
