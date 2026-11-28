<img src="site/icon.svg" width="64" height="64" alt="">

# Running Calculator

Plan your 5K, 10K, half marathon, or marathon. Enter a goal finish time or a pace per
kilometre to calculate the other, with per-kilometre splits and cumulative times.
Your goal stays fixed when you switch distances.

The calculator also shows men's and women's world records for each distance and is
available in English and Spanish. [Open the calculator](https://runningtools.duckdns.org/)

## Run locally

You’ll need Node.js 22.18 or newer and Python 3 for the local server.

```sh
npm ci
npm run build
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

The build writes a static site to `site/`. Open [127.0.0.1:8000](http://127.0.0.1:8000/).
All calculations run in the browser.

## Checks

- `npm test` runs the unit tests.
- `npm run test:e2e` tests the built site after `npx playwright install chromium webkit`.
- `npm run fmt:check` checks formatting, and `npm run size` checks the 11 KiB gzipped
  size budget after a build.
