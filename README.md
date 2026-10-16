# Sondera

Sondera is a privacy-first investigation workflow for examining suspicious messages, links, and online claims. Its local checks present observed indicators, unknowns, and practical next steps without claiming that content is safe or genuine.

## Run locally

```sh
npm install
npm run dev
```

## Project checks

```sh
npm run typecheck
npm run test
npm run build
```

All analysis is intended to run in the browser. Do not add network calls that send user content or fetch user-provided URLs.
