export const USAGE = `Usage:
  lusia build  [dir] [--outdir dist] [--no-minify] [--routes /guide,/reference] [--no-cache] [--quiet]
  lusia dev    [dir] [--port 3000] [--no-cache] [--quiet]
  lusia format [paths...] [--check] [--no-cache] [--quiet]
  lusia lint   [paths...] [--fix] [--max-warnings 0] [--quiet]
  lusia clean  [dir] [--quiet]

  dir       App folder with an index.html and optional lusia.config.json (default: .)
  clean     Deletes the .lusia/cache folder of the app (the disk caches). Nothing else
  paths     .lusia files, folders or globs (default: .)
  --outdir  Output folder, relative to the current folder (default: dist inside the app folder)
  --port    Dev server port (default: $PORT or 3000)
  --routes  Client routes that get their own index.html, so deep links load on static hosts
  --check   List the files that would change and exit 1, without writing
  --no-cache  Build without the disk caches (lusia build and dev). Format: format every file
              instead of skipping unchanged files
  --fix     Apply the safe lint fixes
  --max-warnings  Fail when there are more warnings than this (default: no limit)
  --quiet   Hide the summary output

Dev output (lusia dev), one block per save:
  hot       Component swapped in place, no page reload
  css       Styles swapped in place, no page reload
  reload    Full page reload
  error     Build error, or error in the browser
  wait      Time from the save until the build starts
  styles    Sass to CSS
  compile   .lusia files to JavaScript
  bundle    The bundler
  browser   From the publish until the page reports ready
  total     The build and publish, without wait and browser

Startup (lusia dev header), with a detail line under each part:
  boot      Bun start, and the config read
  types     Screen types written
  cache     Disk caches opened (.lusia/cache)
  styles   Sass to CSS: block count, cached or compiled
  compile   .lusia files to JavaScript: file count, slowest file
  bundle    The bundler: module count (from packages), output size
  server    Dev server start

Keys (lusia dev, in a terminal):
  d         Open the build report (↑↓ move, ←→ stage, s sort, enter expand, esc close)
  r         Rebuild and reload the page
  o         Open the Local URL in the browser
  u         Show the URLs again
  c         Clear the terminal
  h         List the keys
  Ctrl+C    Stop
`;
