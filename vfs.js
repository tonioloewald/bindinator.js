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

## Note

Service workers *do not work on first page load*. Consequently, `vfs`
will *immediately* force a page reload if it sees that the controller is null.
It follows that if you want to use `vfs` you should load it as soon as
possible to avoid rendering the user interface twice.
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
