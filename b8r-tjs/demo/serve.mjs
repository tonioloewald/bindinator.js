// serve.mjs — a tiny static server for the b8r-tjs demos (Bun, no deps).
// `bun start` builds dist + the demo bundles, then runs this; open the URL it
// prints. Serves the b8r-tjs root so /demo, /dist, /node_modules all resolve.
import { join, normalize } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT || 8030)
const landing = '/demo/docs.html'

const server = Bun.serve({
  port,
  async fetch (req) {
    const url = new URL(req.url)
    let path = decodeURIComponent(url.pathname)
    if (path === '/') path = landing
    // contain to the project root (no `..` traversal)
    const filePath = normalize(join(root, path))
    if (!filePath.startsWith(root)) return new Response('Forbidden', { status: 403 })
    const file = Bun.file(filePath)
    if (await file.exists()) return new Response(file)
    return new Response('Not found: ' + path, { status: 404 })
  }
})

console.log(`\nb8r-tjs demos → http://localhost:${server.port}${landing}\n`)
console.log('  /demo/docs.html         doc-browser (nav + live b8r fiddles)')
console.log('  /demo/live-example.html a single b8r fiddle in <live-example>')
console.log('  /demo/blueprint.html    a modern b8r component (todo) via the loader')
console.log('  /demo/list.html         data-list + data-virtual on tosijs\n')
