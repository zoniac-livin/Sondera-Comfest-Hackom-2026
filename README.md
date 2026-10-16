# Sondera

Sondera is a browser-based investigation workflow for messages, URLs, and online claims. Its deterministic checks run locally and present observations, unknowns, questions to investigate, and a Decision Receipt. It does not decide whether content is authentic.

## Architecture

- `src/App.tsx` owns the four-step Submit → Inspect → Investigate → Decide & document flow and active case state.
- `src/analysis/` contains pure URL, message, level, Missing-Proof, Context Clock, and orchestration logic. URL checks parse text with the built-in `URL` API and never fetch the address.
- `src/components/` contains the Investigate and Decision Receipt views and the journey stepper.
- `src/storage/` saves one versioned case in browser `localStorage` with a debounce, restore, and recovery behavior. It does not use IndexedDB.
- `src/report/` builds printable, Markdown, and JSON receipt data.
- `src/styles.css` contains the dark visual system, responsive layouts, focus styles, reduced-motion rules, and print styles. Fonts are bundled from local Fontsource packages.

## Run locally

Install dependencies once, then start the Vite development server:

```sh
npm install
npm run dev
```

Useful checks and the local analyzer:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run analyze -- "<text or url>"
```

## Limitations

- Checks are local pattern matches, not a verdict or a substitute for independent investigation.
- No live reputation, domain age, sender identity, external claim verification, OCR, or attachment scanning is performed.
- The brand list and registrable-domain calculation are limited heuristics and can miss cases or raise false alarms.
- Data is saved in this browser's `localStorage`; it is not synchronized or encrypted by Sondera and can be cleared by browser settings.
- The deferred Gateway Flow landing page is not included because its component source was not supplied.

## Roadmap (not implemented)

- Trust Graph
- What-If Lab
- External reputation checks
