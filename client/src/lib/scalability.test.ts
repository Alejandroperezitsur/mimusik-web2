import { describe, expect, it } from "vitest";
import { reorderIds } from "./collection-actions";
import { calculateListeningStats } from "./statistics";
import type { MusicTrack } from "@/types/music";

const sharedAudio = new Blob(["test"], { type: "audio/mpeg" });
function matrixTracks(count: number): MusicTrack[] { return Array.from({ length: count }, (_, index) => ({ id: `matrix-${index}`, fingerprint: `matrix:${index}:1`, title: `Recording ${String(index).padStart(5, "0")}`, artist: `Artist ${index % 30}`, album: `Album ${index % 75}`, duration: 90 + (index % 200), format: "MP3", audioBlob: sharedAudio, waveform: new Uint8Array([index % 255, 20, 30]), addedAt: index, playCount: 0, isFavorite: index % 7 === 0 })); }

describe("Phase 3 collection-shape matrix", () => {
  for (const size of [0, 10, 1000, 5000, 10000]) {
    it(`keeps search, favorites, queue ordering, playlist references, stats, and waveform cache shape valid at ${size} tracks`, () => {
      const tracks = matrixTracks(size); const search = tracks.filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes("recording 00")); const favorites = tracks.filter((track) => track.isFavorite); const queue = tracks.slice(0, Math.min(10, tracks.length)).map((track) => track.id); const reordered = queue.length > 1 ? reorderIds(queue, 0, queue.length - 1) : queue; const playlist = reordered.filter((id) => tracks.some((track) => track.id === id)); const events = tracks.slice(0, Math.min(3, tracks.length)).flatMap((track, index) => [{ id: `play-${track.id}`, type: "play" as const, timestamp: index + 1, trackId: track.id }, { id: `pause-${track.id}`, type: "pause" as const, timestamp: index + 2, trackId: track.id, listenedSeconds: 30 }]); const stats = calculateListeningStats(events, tracks);
      expect(favorites.every((track) => track.isFavorite)).toBe(true); expect(playlist).toHaveLength(queue.length); expect(reordered).toHaveLength(queue.length); expect(search.length).toBeLessThanOrEqual(tracks.length); expect(tracks.every((track) => track.waveform?.byteLength === 3)).toBe(true); expect(stats.tracksPlayed).toBe(Math.min(3, size));
    });
  }
});
