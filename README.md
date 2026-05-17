# Readable Dev Tools

貼るだけで、読める。データは一切外に出ない。

Readable Dev Tools is a fully client-side static web app for formatting and reviewing unreadable developer text:

- JSON
- Logs
- JavaScript / TypeScript-style code refactoring
- Stack traces
- Minified JS/CSS
- Diffs
- Plain text

## Security model

- 100% local processing
- No API calls
- No data transfer
- No storage
- No cookies
- No external CDN or external libraries

All input stays in browser memory and disappears when the page is closed.

## Deploy

This project is a static site. Deploy the `readable-dev-tools` folder directly to Cloudflare Pages or GitHub Pages.

Cloudflare Pages settings:

- Build command: none
- Build output directory: `/`

