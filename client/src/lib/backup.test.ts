import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./database";
import { createBackup, parseBackup, restoreBackup } from "./backup";
import { makeTrack } from "@/test/helpers";

beforeEach(async () => { await db.open(); await Promise.all([db.tracks.clear(), db.playlists.clear(), db.preferences.clear(), db.queues.clear(), db.playbackEvents.clear()]); });

describe("versioned local backup", () => {
  it("exports audio, art, waveform, collections, queue, preferences, and history into a validated archive", async () => {
    const track = makeTrack({ coverBlob: new Blob(["cover"], { type: "image/png" }), waveform: new Uint8Array([5, 30, 250]), waveformVersion: 1 });
    await db.tracks.put(track); await db.playlists.put({ id: "list-1", name: "Night walk", trackIds: [track.id], createdAt: 1, updatedAt: 1 }); await db.preferences.put({ key: "theme", value: "dark" }); await db.queues.put({ id: "primary", trackIds: [track.id], updatedAt: 1 }); await db.playbackEvents.put({ id: "event-1", type: "play", timestamp: 1, trackId: track.id });
    const blob = await createBackup(); const parsed = await parseBackup(new File([blob], "library.mimusik"));
    expect(parsed.preview.tracks).toBe(1); expect(parsed.preview.playlists).toBe(1); expect(parsed.preview.historyEvents).toBe(1); expect(parsed.payload.tracks[0].waveformFile).toBeTruthy(); expect(parsed.preview.manifest.schemaVersion).toBe(1);
  });
  it("merges without overwriting an existing duplicate and can replace a validated library deliberately", async () => {
    const track = makeTrack({ waveform: new Uint8Array([1, 2, 3]) }); await db.tracks.put(track); const blob = await createBackup(); const parsed = await parseBackup(new File([blob], "library.mimusik"));
    const merged = await restoreBackup(parsed, "merge"); expect(merged.skippedTracks).toBe(1); expect(await db.tracks.count()).toBe(1);
    await db.tracks.put(makeTrack({ id: "other", fingerprint: "other:1:1" })); const replaced = await restoreBackup(parsed, "replace"); expect(replaced.restoredTracks).toBe(1); expect(await db.tracks.count()).toBe(1); expect((await db.tracks.get(track.id))?.waveform).toEqual(new Uint8Array([1, 2, 3]));
  });
  it("rejects an archive that is not a valid MiMusik container before writing data", async () => {
    await expect(parseBackup(new File(["not an archive"], "broken.mimusik"))).rejects.toThrow(/corrupt|valid/i); expect(await db.tracks.count()).toBe(0);
  });
});
