# MiMusik Web — Phase 2 Verification Notes

## Automated tests

The Phase 2 Vitest suite completed with **3 passing test files and 5 passing behavior tests**. The test set checks audio and cover Blob persistence after a Dexie close-and-reopen cycle, favorite persistence, queue persistence, playlist reordering, supported-file validation, duplicate import skipping, and local statistics aggregation.

| Area | Verification |
| --- | --- |
| IndexedDB media persistence | Track audio Blob and cover Blob survive a close-and-reopen cycle in the IndexedDB adapter. |
| Queue and playlist persistence | The durable queue record and reordered playlist IDs are retrieved after reopening the database. |
| Import recovery | Unsupported file names are rejected; repeat audio imports are skipped without duplicating a database record. |
| Statistics | Local event sequences derive total listen time, top track, artist, album, and daily activity. |

## Production and PWA validation

`pnpm check` completed without TypeScript errors. `pnpm build` completed and emitted the PWA manifest, service worker, Workbox runtime, static application shell, and production bundle. The build configuration retains the configurable `VITE_BASE_PATH` setting for GitHub Pages project paths.

## Deterministic large-library benchmark

The benchmark intentionally uses synthetic non-media records only to measure collection-shape operations; it does not insert test tracks into user storage or claim browser-rendering performance. It recorded the following Node-side search, grouping, and favorite-filter timings.

| Records | Search | Artist grouping | Favorites filter | Heap used |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 0.30 ms | 0.23 ms | 0.03 ms | 4.63 MiB |
| 5,000 | 2.18 ms | 0.56 ms | 0.09 ms | 6.72 MiB |
| 10,000 | 2.00 ms | 0.80 ms | 0.07 ms | 10.38 MiB |

The application uses virtualized song rows for rendering. These measurements validate the current filtering and grouping shape, but they are not a substitute for profiling a specific user browser, codec mix, or storage device.

## Offline verification boundary

The implementation stores imported media and artwork as IndexedDB Blobs and does not call a remote playback API. The tests verify a database close-and-reopen path, and the production build confirms a generated service worker and manifest. Browser-level behavior after a physical network disconnect or a fully closed browser can still vary with storage eviction, browser policies, and codec support; it should be acceptance-tested in the user’s target browser before a public portfolio demo.
