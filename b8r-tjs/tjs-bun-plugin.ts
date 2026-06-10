// Bun plugin: import .tjs files directly (transpiled by tjs, with runtime type
// validation injected). Registered via bunfig.toml `preload`, so there is no
// build step for development or tests — `.tjs` just works under bun.
import { plugin } from 'bun'
import { tjs } from 'tjs-lang/lang'

await plugin({
  name: 'tjs-loader',
  setup (build) {
    build.onLoad({ filter: /\.tjs$/ }, async (args) => {
      const source = await Bun.file(args.path).text()
      // runTests:false — inline `test` blocks run in the build/check step,
      // not on every import.
      const result = tjs(source, { filename: args.path, runTests: false })
      return { contents: result.code, loader: 'js' }
    })
  }
})
