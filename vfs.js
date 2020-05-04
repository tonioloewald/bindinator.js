/**
# virtual file system -- service worker

This service worker provides a virtual file system at `/vfs/`

If you POST to /vfs/path/to/file it creates a virtual file at that url.
GET returns the file
DELETE removes it
GET /vsf/path/to/ returns the list of things in that virtual directory
GET /vsf/path/to/* returns the directory and its subdirectories
DELETE /vsf/path/to/ deletes the directory and its contents
If follows that:

GET /vsf/* returns the whole virtual tree.

## Why?!

This all started because I wanted the [fiddle](.?source=fiddle.component.html)
component to handle the new ES6-based Javascript components, which are
`export`ed from an ES6 module as an object constant. You can't `import()`
code programmatically without some kind of
[glorious hack](https://2ality.com/2019/10/eval-via-import.html).

However, it's still a hack. It doesn't handle transitive relative dependencies
(and in fact this bit me with [the first component I tried it on](.?source=components/analog-clock.component.js))
which uses [dom-timers](.?source=lib/dom-timers.js).

This allows fiddles to create virtual files in a local service layer (i.e. `./vfs/`)
and then `import()` them as though they were "out there". In order for this to work
properly, `vfs` even gives the files appropriate mime-types, and so forth.

Ultimately, it would allow you to mount a file system inferred from a service
layer (e.g. github) and, for example, allow a web-based IDE to virtually serve
itself a project from a web-based repository with no actual file-system.

## Note

Service workers *do not work on first page load*. Consequently, `vfs`
will *immediately* force a page reload if it sees that the controller is null.
It follows that if you want to use `vfs` you should load it as soon as
possible to avoid rendering the user interface twice.

> ## If tests are failing…
>
> Right now, `vfs` does not force automatic updates so you may need to force
> the latest version of the vfs service worker to load. Usually a forced
> (shift) refresh with cache-busting will do the trick, but you may need
> to explicitly kill the service worker, e.g. `chrome://inspect/#service-workers`
> in Chrome.
~~~~
// version check
Test(() => b8r.ajax('/vfs/version')).shouldBe('0.1')

// setup
const test_dir = '/vfs/__test_' + Math.random() + '/'
await b8r.ajax(test_dir, 'DELETE')
Test(() => b8r.ajax(test_dir)).shouldBe('[]')

// file creation
await b8r.ajax(test_dir + 'test.txt', 'POST', 'hello world')
Test(() => b8r.ajax(test_dir + 'test.txt')).shouldBe('hello world')
Test(() => b8r.ajax(test_dir)).shouldBe('["test.txt"]')

await b8r.ajax(test_dir + 'test2.txt', 'POST', 'goodbye')
Test(() => b8r.ajax(test_dir)).shouldBe('["test.txt","test2.txt"]')

// delete
await b8r.ajax(test_dir + 'test.txt', 'DELETE')
Test(() => b8r.ajax(test_dir)).shouldBe('["test2.txt"]')

// recursive directory
await b8r.ajax(test_dir + 'sub/test.txt', 'POST', 'sub 1')
await b8r.ajax(test_dir + 'sub/test2.txt', 'POST', 'sub 2')
Test(() => b8r.ajax(test_dir)).shouldBe('["test2.txt","sub/"]')
Test(async () => (await b8r.json(test_dir + '*')).length).shouldBe(3)

// directory deletion
await b8r.ajax(test_dir, 'DELETE')
Test(() => b8r.ajax(test_dir)).shouldBe('[]')
~~~~
*/

const serviceWorkerUrl = window.location.hostname === 'tonioloewald.github.io' ? '/bindinator.js/vfs.worker.js' : '/vfs.worker.js'

export const vfs = (async () => {
  const { navigator } = window
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.register(serviceWorkerUrl).then(registration => {
      if (navigator.serviceWorker.controller === null) window.location.reload()
      // Registration was successful
      console.log('vfs service worker registration successful with scope: ' + registration.scope)
      return 'ok'
    }, err => {
      // registration failed :(
      throw new Error('ServiceWorker registration failed: ' + err)
    })
  } else {
    throw new Error('ServiceWorker not supported.')
  }
})()
