---
name: haltija
description: Verify a web page or web app in a real browser — load a URL, click/type, read the live DOM, run JS, and check the console for errors — using Haltija (browser control for AI agents) and its `hj` CLI. Use when asked to load/open a page, confirm a UI change works in a real browser (not just headless-DOM tests), reproduce a front-end bug, or screenshot/inspect a running app. Works headlessly in a container or against your own browser.
---

# Haltija — browser control for AI agents

Haltija is a small server plus a CLI (`hj`) that lets an agent drive a real
browser: navigate, inspect the DOM, click/type, run JS in the page, and watch
console/network/mutations. Use it to verify front-end behavior that headless-DOM
unit tests (linkedom/jsdom) can't prove — real module loading, CSS, events,
layout.

> First principles: it's designed to be self-describing. If anything below is
> stale, run `hj --help`, `hj <command> --help`, and `curl -s http://localhost:8700/docs`.

## 1. Start a server

```bash
# Default: desktop app if Electron is available, else a plain server.
bunx haltija@latest

# Headless (CI / no display): drive a headless browser, optionally open a URL.
# Register a name so hj can find this server, and force-restart if one is running.
bunx haltija@latest --server --headless --name myapp --force \
  --headless-url http://localhost:8030/your-page.html
```

Starting Haltija installs the `hj` client (it printed `Installed: ~/.local/bin/hj`).
Make sure that's on `PATH`:

```bash
export PATH="$PATH:$HOME/.local/bin"
```

The server prints its URL (default `http://localhost:8700`) and name. Target a
named server from any shell:

```bash
export HALTIJA_NAME=myapp     # all hj calls in this shell talk to "myapp"
# or per-call: hj --name myapp <cmd>   /   hj --port 8700 <cmd>
```

### Headless in a display-less container

There is no display, so the **desktop app and `hj screenshot` are unavailable**.
Use `--headless`, which needs a headless browser backend; if it can't find one it
will say so (e.g. asking for Playwright). The reliable recipe:

```bash
# 1) serve the page (any static server)
python3 -m http.server 8030 >/tmp/httpd.log 2>&1 &

# 2) if --headless reports no browser, install one for it (siblings matter — put
#    playwright next to haltija and reuse one browser dir):
#    cd /tmp/pw && bun add haltija@latest playwright@latest
#    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers ./node_modules/.bin/playwright install chromium
#    then run ./node_modules/.bin/haltija (so it resolves its sibling playwright).

# 3) point Haltija at the page and wait for "Window connected"
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers ./node_modules/.bin/haltija \
  --server --headless --name myapp --force --headless-url http://localhost:8030/your-page.html \
  >/tmp/haltija.log 2>&1 &
# readiness: grep -q "Window connected" /tmp/haltija.log
```

In **normal use** (desktop app, or the bookmarklet/`dev.js` snippet on your own
browser) no Playwright is needed — that's only the display-less `--headless` path.

## 2. Drive it with `hj`

```
See:       tree [selector] [-d N] [-i] [-v]   inspect <@ref|selector>   console
Interact:  click <@ref|selector|"text">       type <@ref|sel> <text>    key <key>
Move:      navigate <url>    refresh [--soft]  eval <code>              find <text>
Watch:     events|mutations|network [watch|unwatch|stats]
```

`hj eval` runs JS **in the page** and returns JSON:
`{ id, success, data, error, timestamp, window }` — read `.data`.

### Reliable patterns (learned the hard way)

- **Prefer `hj eval` with a single expression or IIFE** for both reads and
  actions — it's exact and returns the value you assert on:

  ```bash
  hj eval "document.querySelector('.counter .n').textContent"        # read
  hj eval "(() => { document.querySelector('#save').click();
                    return document.querySelector('.status').textContent })()"
  ```

- **`hj click \"+text\"` matches by text and is fragile** with unicode (`−`),
  short/ambiguous labels, or duplicated text. When it doesn't land, use
  `hj eval` with a precise selector + `.click()`, or get a stable `@ref` from
  `hj tree -i` and click that.

- **Check for errors explicitly** — a silent page is not a passing page:

  ```bash
  hj console            # console output (includes errors)
  hj eval "performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name)"
  ```

- **`hj screenshot` requires the Desktop app.** In headless/container runs it
  returns an error; capture via your own Playwright/Chromium instead if you need
  an image, or rely on `hj tree`/`hj eval` for structural assertions.

## 3. Worked example — verify a local ESM page

```bash
export PATH="$PATH:$HOME/.local/bin"; export HALTIJA_NAME=myapp
hj navigate "http://localhost:8030/your-page.html"
hj eval "({ title: document.title, mounted: !!document.querySelector('#app *') })"
hj eval "(() => { document.querySelector('#inc').click(); return document.querySelector('#count').textContent })()"
hj console            # confirm zero errors
```

## 4. CI testing

Haltija is a first-class CI testing tool, not just an interactive driver. The
split that works well in practice:

- **Playwright** → cross-browser **smoke tests** (Chromium/Firefox/WebKit parity).
- **Haltija** → **everything else** — functional and integration browser testing,
  which is faster to author and drive.

Run it in CI:

```bash
# --ci: Electron app + wait-for-ready + sandbox disabled (pair with a virtual
#       display such as xvfb-run). Or use --headless for a pure headless browser.
# --snapshots-dir saves artifacts; --wait-ready blocks until ready for scripting.
bunx haltija@latest --headless --name myapp --wait-ready \
  --snapshots-dir ./artifacts \
  --headless-url http://localhost:8030/your-page.html
# lock it down on shared CI networks: --token "$HALTIJA_TOKEN"  (then hj --token …)
```

Author and run test files with the `test` / `recording` commands:

```bash
hj recording start        # drive the app…
hj recording stop
hj recording generate     # …emit a test file from those actions
hj test run <file>        # run it  (also: hj test suite <file> | hj test validate <file>)
```

(Exact test-file format: `hj test --help` and `hj recording --help`.) For
fully scripted checks you can also just chain `hj eval`/`hj click` calls (§2/§3)
and assert on their JSON `.data` — exit non-zero on mismatch.

## 5. Desktop / MCP integration

On a machine with a display you can register Haltija as a Claude Desktop MCP
server (exposes `mcp__*` browser tools instead of the CLI):

```bash
bunx haltija@latest --setup-mcp          # configure;  --setup-mcp-check / --setup-mcp-remove
```

## Notes

- The local server writes a `.haltija/` runtime dir in its working directory —
  **gitignore it** (`.haltija/`), don't commit it.
- `--token <secret>` (env `HALTIJA_TOKEN`) locks down REST/WebSocket; pass
  `hj --token <secret>` to match.
- Multiple apps at once: start several servers with different `--name`s and
  switch with `HALTIJA_NAME`.
