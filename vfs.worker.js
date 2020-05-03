/* global clients, self, Response, fetch */

const version = '0.1'

const vfs = {}

const mimeTypes = {
  svg: 'image/svg+xml',
  css: 'text/css',
  jpg: 'image/jpeg',
  png: 'image/png',
  json: 'application/json',
  js: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  html: 'text/html',
  mp4: 'video/mp4',
  mov: 'video/quicktime'
}

const defaultMimeType = 'application/octet-stream'

self.addEventListener('install', () => {
  console.log('vfs installed')
})

self.addEventListener('activate', (event) => {
  console.log('vfs activated')
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { method, url } = event.request
  if (url && url.match(/^.*\/vfs\//)) {
    console.log('vfs', method, url)

    const vfsPath = url.replace(/^.*\/vfs\//, '')

    if (vfsPath === 'version') {
      if (method === 'GET') {
        event.respondWith(new Response(version, { status: 200 }))
      } else {
        event.respondWith(new Response('method not allowed', { status: 405 }))
      }
      return
    }

    switch (method) {
      case 'GET':
        {
          let found
          if (vfsPath === '*' || vfsPath.endsWith('/*')) {
            const basePath = vfsPath.substr(0, vfsPath.length - 1)
            found = Object.keys(vfs).filter(path => path.startsWith(basePath))
          } else if (vfsPath === '' || vfsPath.endsWith('/')) {
            const offset = vfsPath.length
            found = Object.keys(vfs).filter(path => path.startsWith(vfsPath))
              .map(path => path.substr(offset).match(/[^/]+($|\/)/))
              .reduce((uniques, [a]) => {
                if (!uniques.includes(a)) uniques.push(a)
                return uniques
              }, [])
              // .filter(path => path.indexOf('/', vfsPath.length) === -1)
          } else {
            found = vfs[vfsPath]
          }
          if (!found) {
            event.respondWith(new Response('not found', { status: 404 }))
          } else if (typeof found === 'string') {
            const extension = vfsPath.split('.').pop()
            const headers = { 'Content-Type': mimeTypes[extension] || defaultMimeType }
            event.respondWith(new Response(found, { headers }))
          } else {
            const headers = { ContentType: mimeTypes.json }
            event.respondWith(new Response(JSON.stringify(found, { headers })))
          }
        }
        break
      case 'POST':
        if (vfsPath.endsWith('/') || vfsPath.endsWith('/..')) {
          // can't post to a directory
          event.respondWith(new Response('method not allowed', { status: 405 }))
        } else {
          event.respondWith((async () => {
            vfs[vfsPath] = await event.request.text()
            return new Response('ok', { status: 200 })
          })())
        }
        break
      case 'DELETE':
        if (vfsPath.endsWith('/') || vfsPath.endsWith('/..')) {
          Object.keys(vfs).forEach(path => {
            if (path.startsWith(vfsPath)) {
              console.log('vfs deleting', path)
              delete vfs[path]
            }
          })
          event.respondWith(new Response('ok', { status: 200 }))
        } else {
          if (vfs[vfsPath]) delete vfs[vfsPath]
          event.respondWith(new Response('ok', { status: 200 }))
        }
        break
      default:
        event.respondWith(new Response('method not allowed', { status: 405 }))
    }
  } else {
    event.respondWith(fetch(event.request))
  }
})
