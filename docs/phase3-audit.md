# MiMusik Web — Phase 3 Baseline Audit

## Retained foundations

MiMusik already has a coherent client-only foundation. Imported media and embedded art are stored as `Blob` values in Dexie, while queue, playlists, preferences, and playback events have local persistence models. The browser audio engine uses one `HTMLAudioElement`, explicitly revokes audio object URLs, and routes playback events into the local statistics model. Song rendering is virtualized, and the metadata parser already uses a dynamic import rather than occupying the initial application module.

The existing PWA configuration generates a manifest, service worker, configurable static base path, and cached app shell. The Phase 2 test suite verifies key persistence, importer, and statistics behaviors. This baseline will be extended rather than replaced.

| Audit area | Present state | Phase 3 decision |
| --- | --- | --- |
| Media persistence | Audio and artwork live in IndexedDB track records. | Preserve records; add compact waveform data to the track model. |
| Queue and collections | Queue, playlists, favorites, and listening events already persist. | Include every local record in a versioned backup container. |
| Import pipeline | Per-file errors, duplicates, cancellation, metadata parsing, and Blob storage exist. | Add best-effort waveform generation without making an imported track unusable when decode fails. |
| Bundle boundaries | Metadata is lazy, but the application root mounts Home directly and Stats/playlist detail remain in the main UI path. | Introduce focused lazy boundaries for heavy workspaces and diagnostics. |
| Integrity tools | No non-destructive inspection or confirmed repair workflow exists. | Add health reporting first; never auto-delete user media. |
| Storage tools | No library-size breakdown, maintenance actions, or quota readout exists. | Add a local storage workspace with explicit confirmations. |
| Backup and restore | No export container, schema version, preview, conflict model, or recovery logic exists. | Add a local `.mimusik` ZIP-compatible archive with schema validation and transactional restore. |

## Risks and boundaries

Browser audio decoding cannot be guaranteed for every codec, and audio decoding for waveform creation can fail independently of metadata parsing. The Phase 3 importer will therefore persist the track even when static waveform extraction is unavailable and will expose that condition as a recoverable diagnostic rather than dropping the user’s media.

Backup restore cannot rely on a backend rollback. The restore path will validate the archive before any write, stage all accepted records in memory, and use a Dexie transaction for database writes. A **Replace** operation will require explicit confirmation and will only clear affected tables once the archive has passed structural validation. Browser quota and storage eviction remain browser-controlled constraints and will be documented without being presented as guaranteed behavior.

## Initial bundle observation

The previous production build emitted one large JavaScript chunk of approximately 1.42 MiB before compression alongside a smaller initial application chunk. The current app root lacks `React.lazy` boundaries, while Recharts and the music-metadata parser are the most likely sources of heavyweight secondary code. Phase 3 will measure post-change build output rather than claim a reduction before it is verified.
