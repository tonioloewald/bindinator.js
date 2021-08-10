# Debugging Tips

## Make `b8r` a global

    import b8r from './path.to.b8r.js'
    window.b8r = b8r
    window.reg = reg

Make `b8r` and potentially `b8r.reg` a global for debugging. (Don't ship it, though!)
One way to make sure it doesn't get into production is to make a debugging component
that is conditionally lazy-loaded on launch. This won't get rolled up into your
code accidentally.

This is probably the single simplest trick for easy debugging. Inside the console
you can interrogate objects and watch any low level stuff going on.

## Use `data-debug` `data-debug-bind` and `data-debug-event`

These will cause b8r to log a warning in console when bindings or event handlers
are firing. `data-debug` will generate a ton of false positives unless you stick
it in a very specific area (i.e. an element with few or no bound children).

Both will generate a lot of false positives on startup, which is why they
only fire off console.warn, and it's up to you to set breakpoints.

## Use `b8r.observe` to keep an eye on the registry

If you observe a path, you can have an event handler fire when anything
in that path is touched. You can even use a `RegExp` or boolean functions to filter
observations.

Unlike binds, `observe` fires immediately (synchronously) when a change to the
registry is signalled (either by a real change or an explicit `touch`), whereas
binds simply add an item to the update queue which is then batched (which can
make it hard to tie a change to its root cause).
