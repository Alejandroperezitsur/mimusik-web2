# MiMusik Web

> **Your library, close at hand.** MiMusik Web is a browser-native, offline-first listening desk for music the listener already owns. It imports local audio into device storage, plays it without an account or catalog service, and keeps the collection, queue, playlists, preferences, and listening history in the browser.

## Features

MiMusik imports MP3, WAV, OGG, FLAC, M4A, and AAC files through a local-first workflow. It reads supported embedded metadata and cover art, preserves the original audio Blob, deduplicates using a source fingerprint, and reports individual import failures without exposing stack traces.

The listening workspace includes a persistent queue with reordering, contextual play-next actions, editable playlists, favorites, recent plays, local statistics, a compact mobile player, keyboard shortcuts, and a seekable waveform rail. New imports attempt to produce a compact 256-sample static waveform cache; the track remains usable when a browser cannot decode it for waveform analysis.

Phase 3 adds a versioned `.mimusik` backup and restore system, Library Care storage reporting, non-destructive health checks, explicit maintenance actions, focused loading boundaries, and a bundle-analysis command.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Application | React 19 and TypeScript | Client-side workspace, reusable components, loading boundaries, and accessible interaction state. |
| State | Zustand | Immediate player intent, preferences, controls, and UI-coordinated queue state. |
| Persistence | IndexedDB through Dexie | Audio blobs, artwork, waveforms, playlists, queue, preferences, and playback events. |
| Audio | `HTMLAudioElement` and Web Audio API | A single playback source, analyser fallback, object URL lifecycle, and seekable player state. |
| Delivery | Vite PWA and Workbox | Static application shell, service worker, manifest, visual asset caching, and configurable GitHub Pages base path. |

The audio engine is the only module that owns the live audio element. `useAudioPlayer` coordinates its events with the persisted library and local statistics. UI surfaces request actions through that layer rather than creating ad hoc audio instances or treating local blobs as remote URLs.

## Offline-first architecture

MiMusik imports a chosen `File` into a stored audio Blob rather than keeping a filesystem path or a directory permission. Cover art and compact waveform values are retained beside the track record. Playback later creates a short-lived object URL only from that stored Blob, then revokes it when the source changes or the engine is destroyed.

The application has no backend, authentication layer, or music-catalog API. After the PWA shell is successfully visited and cached, the browser can start the application and navigate its locally stored library offline. Imported media belongs in IndexedDB rather than the service-worker cache, which avoids duplicating the same audio file in two client-side stores.

## Persistence model

| Data | Storage location | Notes |
| --- | --- | --- |
| Audio, cover art, metadata, play count, favorites, waveform cache | `tracks` table | Media values are browser `Blob` objects; waveform values are small `Uint8Array` records. |
| Playlist order | `playlists` table | Playlist records store local track IDs and timestamps. |
| Queue | `queues` table | The primary queue survives refreshes and is restored into the live player. |
| Playback history and stats inputs | `playbackEvents` table | Local events power the listening log and statistics. |
| Preferences | `preferences` table and lightweight player persistence | Theme and durable browser-local settings remain on the device. |

Dexie schema version 3 adds a waveform version index while retaining all earlier tables. Library Health never auto-deletes songs: it reports missing audio, invalid metadata, duplicate candidates, and orphaned references before presenting an explicit repair action.

## Audio pipeline

```text
File import
  → metadata and duration read
  → optional embedded artwork extraction
  → best-effort compact waveform decode
  → IndexedDB track Blob record
  → single audio engine object URL
  → Web Audio analyser / cached waveform rail
  → persistent player, queue, history, and stats
```

The waveform cache contains 256 peak-amplitude bytes, not a rendered image or a retained decoded buffer. It is fast to draw, is included in backups, and can be cleared from Library Care. Browser decode failure intentionally leaves waveform cache absent while preserving the imported audio track.

## Backup system

Backup export creates a local `.mimusik` archive using a ZIP-compatible structured container. It contains a `manifest.json`, `library.json`, audio media entries, optional artwork entries, and optional waveform entries. The manifest identifies the format, schema version, creation time, app version, migration metadata, record counts, and per-entry SHA-256 integrity hashes.

Restore validates the extension, size safety limit, archive structure, schema compatibility, referenced media entries, and integrity hashes before it opens a database transaction. The preview presents record counts, archive size, existing-library conflicts, and warnings. **Merge** adds non-conflicting records; **Replace** requires an explicit acknowledgement before clearing the local data tables and restoring the validated archive. Cancelled or invalid archive operations leave the existing library unchanged.

## Performance

The original Phase 2 production output included a 1.42 MiB uncompressed shared JavaScript chunk. Phase 3 introduces lazy boundaries for the shell, statistics, playlist workspace, and Library Care, then uses manual cacheable chunks for the charting tree, metadata parser, and sortable workspace. The final analyzed build emits a 478.06 kB application entry, a 414.81 kB Home workspace, and deferred 431.05 kB charting, 340.50 kB metadata, 76.09 kB Library Care, 45.38 kB sortable-workspace, and 26.25 kB playlist-workspace chunks.

These are build artifact sizes, not network or rendering timings. The deterministic collection benchmark measures pure in-memory search, grouping, and favorites filtering; it does not claim real-device or browser-render performance.

| Records | Search | Artist grouping | Favorites | Heap used |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 0.18 ms | 0.16 ms | 0.02 ms | 4.63 MiB |
| 5,000 | 1.17 ms | 0.40 ms | 0.09 ms | 5.78 MiB |
| 10,000 | 1.06 ms | 0.60 ms | 0.05 ms | 10.42 MiB |

Run `pnpm analyze` to regenerate `docs/bundle-analysis.html`, or run `node scripts/benchmark-library.mjs` to repeat the collection benchmark.

## Testing

```bash
pnpm check
pnpm test
pnpm build
pnpm analyze
node scripts/benchmark-library.mjs
```

The final automated suite contains **7 passing files and 16 passing behavior tests**. It covers Blob persistence through database reopen, queue and playlist persistence, import filtering and duplicate skips, versioned backup creation, merge and replace recovery, corrupt backup rejection, health inspection, explicit maintenance actions, statistics derivation, waveform fallback behavior, and deterministic collection shapes at 0, 10, 1,000, 5,000, and 10,000 records.

## Accessibility

The player controls, queue trigger, dialog close controls, search, and maintenance actions have accessible names. The waveform canvas exposes slider semantics with keyboard seeking; volume uses a native range input; reduced motion is respected by existing motion styles. Import dialog focus is moved into the modal, constrained while it is open, restored on close, and supports Escape unless a protected import is active. Queue and playlist ordering use accessible drag-and-drop controls with keyboard support from the selected sortable primitives.

## Browser limitations

Browser codec support, IndexedDB quota, storage eviction policies, and Web Audio decoding are browser-controlled. A file can import yet be unplayable in a browser that lacks its codec. The waveform cache is best effort and is not generated when the audio decoder rejects the Blob or the file exceeds the conservative decode threshold. Clearing site data clears the local library. The PWA shell is verified as generated, but physical offline restart behavior should still be acceptance-tested in each target browser because browser storage policies differ.

## Deployment

MiMusik is a static frontend. Set a repository path when building for GitHub Pages, then publish `dist/public` through the hosting workflow.

```bash
VITE_BASE_PATH=/your-repository-name/ pnpm build
```

The manifest uses a relative `start_url`, the service worker is generated by Vite PWA, and the runtime configuration keeps the application shell compatible with a project-path deployment.

## Screenshots

Add representative desktop and mobile captures here after publishing:

```text
docs/screenshots/library-desktop.png
docs/screenshots/library-care-desktop.png
docs/screenshots/library-care-mobile.png
```

## Technical recruiter review

| Technical strengths | Architecture decisions | Honest limitations |
| --- | --- | --- |
| Blob-backed offline media survives file-path loss after import. | One audio engine owns playback and object URL cleanup. | Real browser offline restart was not physically simulated under a network disconnect. |
| Queue, playlists, history, preferences, and media have local persistence. | Dexie is the source of truth; live state is layered over it for responsiveness. | Large backup archives are assembled in browser memory rather than streamed. |
| Backup archives are versioned, structurally validated, and integrity checked. | Restore validates before a transaction and requires Merge or acknowledged Replace. | Codec support and waveform decode remain browser-dependent. |
| Health checks are non-destructive and maintenance actions are confirmed. | Derived waveform data is compact and optional, not an image or decoded buffer. | Search filtering is measured in Node but has not been profiled on every target device. |
| Heavy workspaces are lazy-loaded and explicit chunk analysis is repeatable. | App shell, stats, playlists, Library Care, charts, and metadata parsing load independently. | No cloud sync or cross-device library transfer is included by design. |
