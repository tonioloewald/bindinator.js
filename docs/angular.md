# Angular vs. b8r

> #### Caution
>
> I'm not experienced with Angular. I've never worked with it professionally.
> About 75% of the time when I describe `b8r` or point someone at the docs
> they'll say "oh, it looks like Angular". I think the similarities are
> superficial, but I am no expert on Angular.

## Yet More DSLs

To be a good web-developer you need to be proficient in HTML, CSS, and
Javascript (or some language that gets transpiled into Javascript). 
Having to code in other DSLs (domain-specific languages) means needing
to learn even more languages (nothing will save you from needing to 
understand HTML, CSS, etc.) and then understand both the source code
and the output, and tie the second to the first.

With `b8r` you just write regular Javascript, HTML, and CSS. No tooling or
transpilation is required. Angular, like React, leans heavily on tooling 
and "magic at a distance".

## Not Quite HTML

You can kind of puzzle out what this does, but it smells like a whole
new programming language *and* a templating language.

    <div *ngFor="let product of products">
      <h3>
        {{ product.name }}
      </h3>
    </div>

vs:

    <div data-list="path.to.products:uuid">
      <h3 data-bind="text=.name"></h3>
    </div>

The `b8r` example is simply HTML. It's going to be parsed and rendered by
the browser using its native C++ HTML pipeline. The Angular code is some
kind of templating language that's going to be parsed and rendered using
Javascript code (or, if you're lucky, WebAssembly) that you have to both
download, load into RAM, and run.

`b8r`'s bindings do have a simple syntax, but it's designed to be almost
self-explanatory, and experience has shown that programmers completely new
to `b8r` can read b8r bindings and grok what they do (although it can take
a few visits to the documentation to understand how to write some of the
more exotic bindings)

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

    // I have no idea what the second part is supposed to do
    // it looks like a custom-element… is it?!

It all looks very boiler-plate and not DRY.

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

By the looks of things, a simple component can easily end up being four different
source files.

Also, on top of needing to learn and read Angular's template syntax inside
your HTMLish code, you now need to code in some kind of jsx-like declarative
syntax in your source files.

## Verbosity

The Angular tutorial doesn't actually do anything, and yet takes more code
and explanation than the React *To Do* tutorial (which at least does something).

## To Be Continued…

To its credit, the Angular tutorial goes on to take you through constructing
services and adding some "real" functionality for the example Shopping Cart.
The tutorial, however, seems very long and tedious for the amount of actual
functionality delivered.