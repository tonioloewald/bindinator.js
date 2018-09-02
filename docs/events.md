# events

## Event Binding

The basic form of an event-binding is `data-event="event-type:path.to.event_handler"`.

```
<button data-event="click:path.to.click_handler">Click Me</button>
```

You can trigger the same handler via multiple events using commas.

```
<button data-event="touchend,mouseup:path.to.action">Use Me</button>
```

You can put multiple event handlers on an element using semicolons.

```
<button data-event="
  touchend,mouseup:path.to.action;
  mouseover:path.to.hover;
  mouseout:path.to.leave;
">Use Me</button>
```

Whitespace between handlers is ignored, but no whitespace is allowed in the handler itself.

## Event Propagation (Surprise!)

In general, one of the central principles of `b8r`'s design is _the principle of least surprise_.
The goal is that any reasonably experienced web developer should be able to look at `b8r` code 
and grok what's going on.

`b8r` handles events in a slightly surprising way, violating this principle.

- all events "bubble"
- handling an event stops it
- return `true` from an event handler to allow it to continue bubbling

In JavaScript different events have different "bubbling" behavior. Some events are received by
an element but not its ancestors. Others are received only by the document.

In `b8r` all events 'bubble' unless you tell them not to. Also all events stop (and preventDefault)
when handled unless the event handler returns an explicit `true`.

I hope you find this tradeoff to be worthwhile. It is borrowed from the way events behaved in
*HyperCard* which I continue to regard as the most productive and robust development environment I have ever used.

Also see [b8r.events.js](#source=source/b8r.anyEvent.js).

## Keyboard Events

`b8r` provides some very convenient shorthand for dealing with keyboard events. You can specialize
a keyboard event (e.g. `keyup`) by adding specific keys in parentheses:

```
<input data-event="keydown(Enter):path.to.enter_key_handler">
```

To find out how to specify keys, you can use the 
[keyboard event utility](#source=keycodes.component.html), which is also
embedded in the [keystroke library](#source=source/b8r.keystroke.js) documentation.

## Catching Events Early

A common requirement when building user interfaces is to handle an event before anything else can
get at it.

Also see [b8r.anyEvent.js](#source=source/b8r.anyEvent.js).

```
// handle an event before anything else gets a look at it
b8r.onAny('event-type', 'path.to.event_handler');

// note that as per normal, the handler will block events of the type it handles unless
// the handler returns an explicit true.

// later, when you need to tear down the handler
b8r.offAny('event-type', 'path.to.event_handler');
```