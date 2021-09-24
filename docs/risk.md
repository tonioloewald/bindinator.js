# Isn't using b8r a huge risk?

Obviously, `b8r` is a much less well-known library/framework than pretty much
any other library you might choose, and "no-one ever got fired for picking
React", right? Right?

So far, `b8r` has been used successfully in for a consumer-facing product once,
and the approach was used successfully within USPTO. I've been using variations
of this approach for pretty much 25 years, evolving and improving it as I've
gone along, and it's never bitten me. (The same approach was used for RiddleMeThis,
a desktop application I sold for over a decade, and for Media Mover 3, which I
developed and later updated on contract.)

## React is instant tech debt

(And Angular is worse.)

React seems to be successful when used to create widget libraries, which is
something that web-components do better and more compatibly and interoperably
today, but it's terrible when it comes to higher level "views". In my experience
across multiple large organizations, code reuse is poor both within projects
(e.g. typically a list of things involves at minimum four new bespoke classes,
even if similar lists of things are present everywhere else) and between projects,
where business logic ends up interwoven with both presentation and state management
to the point where apps get rewritten from scratch on a biannual basis.

Meanwhile, humble jQuery applications remain in production, and updated and
improved without difficulty, decades after being originally written.

## If you end up ditching `b8r` most of your code is fine

Because the natural way to build `b8r` apps is:

1. Standards-compliant HTML and CSS (with CSS either global or scoped to components)
2. A thin layer of view controller code (inside `b8r` components)
3. Application state in one or more registered objects
4. Important logic in vanllajs libraries

Almost all of your investment in time, testing, and QA will be in the bottom two
layers, which are completely uncoupled from `b8r`.

What's more, the HTML and CSS are so generic that they can probably be reused
unless you're moving to a framework that requires all your HTML and CSS to be 
written in a custom language.

## `b8r` allows developers to ramp up insanely fast

In my experience, experienced developers are up-and-running on `b8r`, either
starting from scratch or onboarding onto an existing gnarly codebase, within
a day, or sometimes a few hours.

One colleague tried `b8r` out for an internal project at Uber ATG, and learned
the framework and built the app in a couple of days; a veteran React developer,
he estimated it would have taken him over two weeks to get the same work done 
with React.

At Airtime, I used `b8r` to create a new implementation of our web/desktop
application, that had then been in development by a team of three for over
six months, in a few evenings of spare time (by which time it was far more
functional than the React app). I pitched it to the CTO (a back-end coder)
who reviewed the code, and found and fixed a bug, the next evening.

We switched to `b8r`. When we onboarded new developers, they were productive
within a day.

## `b8r` leverages and builds on knowledge developers already have

Because `b8r` components are built out of HTML and CSS, and `b8r` event handlers
are just thin wrappers around bog standard javascript, you don't need to learn
`b8r`-specific stuff to get work done, you use the knowledge you already have
about web-standards and build on it as you go.

And when you do use `b8r`'s functions, they're not only a thin wrapper around
underlying language and browser functions, where possible exactly what they're
doing is documented. There's no "and then magic happens" mystery meat. To
learn `b8r` is to learn how not to even need `b8r`.

## `b8r` is not a sheltered workshop for framework noodlers

The great thing about React and Angular is the amount of busywork they
generate, allowing programmers to seem productive while simply moving
a widget from one place in a DOM hierarchy to another. A change that is
so trivial in `b8r` as to not usually warrant a specific task.

A simple example: to bind an array to the DOM in `b8r` you simply write:

    <li data-list="path.to.list:id">...</li>

This tells `b8r` to:

1. create one instance of the list item for each item in the array
2. bind each DOM element to the array item by the id property in that item

In React you'd need to define the key manually (this was obviously something
you have to do a lot, so `b8r` makes it easy). In Angular you need to define
a function.

It also covers a whole bunch of busywork involving not unnecessarily rendering
elements that don't change, etc. etc.. In `b8r` views this often replaces
having to create several bespoke classes, and leads to no wrapper-elements
in the DOM. (Similarly, `b8r` does not festoon the DOM with comments used
to anchor non-rendered elements the way Angular does; this allows `b8r` to
efficiently render, filter, scroll, and update virtual tables with over 1M rows.)

And `b8r` does all this with fewer elements in the DOM and less memory and
CPU than its alternatives.

## `b8r` both allows and encourages business logic to be generic

THe easiest way to eliminate risk in choosing architectures is to decouple your
choices. `b8r` doesn't impose any special structure or requirements on your 
model code. Just write generic javascript and import the classes and functions.

By the same token, if you start with `b8r` there is no reason to "infect" your
model code with `b8r` specific implementation details. `b8r` is explicitly designed
to handle wiring, between the presentation layer and data, and between user actions
(and other events) and logic. How you generate the data, and what your logic does
do not matter to `b8r`.

If you want events to trigger back-end actions that produce updates that flow down
through the app (React's idealized model), `b8r` will do that, and do it more
efficiently than React. But if you want data to behave in more localized ways
(e.g. stateful modular subcomponents), `b8r` is fine with that too.

The cleanest and simplest way to implement `b8r` applications is to cleanly
separate model logic from presentation logic, and presentation logic from
layout. This allows each layer to be modified without major fallout costs.

## `b8r` plays nice with everything

It is easy for `b8r` projects to reuse legacy code, including cjs (`require`-based)
and iife modules (`&lt;script>`-based) without modification.