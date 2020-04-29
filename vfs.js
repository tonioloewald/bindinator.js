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
*/

const serviceWorkerUrl = location.hostname === 'tonioloewald.github.io' ? '/bindinator.js/vfs.worker.js' : '/vfs.worker.js'

export const vfs = (async () => {
  const {navigator} = window
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
