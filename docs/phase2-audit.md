# MiMusik Web — Phase 2 Baseline Audit

## Scope and method

This audit reviewed the existing local data schema, browser audio engine, persisted player state, import path, library surfaces, PWA configuration, and available test setup before any Phase 2 implementation work. The review distinguishes working behavior from visual placeholders so that functional architecture is retained where it is already sound.

## Confirmed existing behavior

| Area | Current implementation | Audit finding |
| --- | --- | --- |
| Imported audio | `MusicTrack` stores `audioBlob` in the Dexie `tracks` table. | **Implemented.** The source file is retained as a browser `Blob`; playback creates an object URL only at load time. |
| Embedded artwork | `coverBlob` is retained on the same local track record. | **Implemented.** Artwork does not depend on a remote image host after import. |
| Library state | Tracks, playlists, favorites, recents, and generic preferences use Dexie. | **Implemented**, although no behavior tests prove recovery yet. |
| Playback intent | Queue IDs, active track, timestamp, volume, mute, shuffle, and repeat state use persisted Zustand storage. | **Partially implemented.** It survives local storage restoration, but the requested durable queue record is not represented in IndexedDB. |
| Object URLs | The engine revokes the previous URL when loading another track and on destruction. Cover-art URLs are revoked on component cleanup. | **Implemented with gaps.** Rapid load changes still have no sequence guard, and there is no explicit error recovery path. |
| Library scale UI | Songs are rendered through `@tanstack/react-virtual`. | **Implemented.** Search still filters the full array on the main thread and has not been measured at 1k, 5k, or 10k records. |
| PWA and GitHub Pages | `VitePWA`, a manifest, Workbox app-shell fallback, asset caching, and `VITE_BASE_PATH` are configured. | **Implemented.** Production and offline-start behavior require explicit Phase 2 verification. |
| Keyboard and motion | Playback shortcuts guard inputs; the custom search shortcut exists; reduced motion styles are present. | **Implemented with gaps.** Focus management, menu semantics, and route-level keyboard access need improvement. |

## Functional gaps to implement

The current queue is only an array of IDs in the player store. Its visible queue buttons are placeholders, it has no drawer or mobile sheet, and it cannot reorder, remove, clear, or schedule a track to play next. Phase 2 must introduce a real persisted queue record and durable actions rather than adding a presentational list.

Playlist records already persist, but the current surface only creates and starts a playlist. It has no detail view, duration summary, editable order, add/remove controls, context actions, or immediate persistence after reordering. The new detail workspace should build on the existing `Playlist` record rather than introducing a duplicate collection model.

Local playback statistics, waveform rendering, route `/stats`, behavior tests, import cancellation, per-file invalid-file reporting, and large-library measurement do not exist. The audio engine also needs a load sequence guard and user-visible recovery for corrupt or unplayable media.

## Phase 2 implementation rules

The Dexie track and playlist records remain the source of truth for imported media and saved collections. The queue will become an explicit local record so it can survive refreshes and browser restarts without relying only on synchronous storage. Statistics will be calculated from locally persisted event records; no backend or remote audio API will be introduced. Existing virtualized lists, generated visual assets, theme behavior, and the Quiet Analog Atelier design language will be preserved.
