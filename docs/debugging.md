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

These will cause b8r to log a warning in console when an element is being
bound