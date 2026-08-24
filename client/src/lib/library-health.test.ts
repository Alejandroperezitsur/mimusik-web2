import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./database";
import { clearListeningHistory, clearWaveformCache, inspectLibraryHealth, removeOrphanedReferences } from "./library-health";
import { makeTrack } from "@/test/helpers";

beforeEach(async () => { await db.open(); await Promise.all([db.tracks.clear(), db.playlists.clear(), db.preferences.clear(), db.queues.clear(), db.playbackEvents.clear()]); });

describe("library health and maintenance", () => {
  it("reports missing audio, duplicate candidates, invalid metadata, and orphaned local references without mutating records", async () => {
    const good = makeTrack({ waveform: new Uint8Array([1, 2]) }); const duplicate = makeTrack({ id: "duplicate", title: "Second copy" }); const invalid = makeTrack({ id: "invalid", fingerprint: "invalid:1:1", title: "", audioBlob: new Blob([]) });
    await db.tracks.bulkPut([good, duplicate, invalid]); await db.playlists.put({ id: "list", name: "Broken list", trackIds: [good.id, "gone"], createdAt: 1, updatedAt: 1 }); await db.queues.put({ id: "primary", trackIds: [good.id, "gone"], updatedAt: 1 }); await db.playbackEvents.put({ id: "gone-event", type: "play", timestamp: 1, trackId: "gone" });
    const report = await inspectLibraryHealth(); expect(report.missingAudio).toHaveLength(1); expect(report.invalidMetadata).toHaveLength(1); expect(report.duplicateCandidates).toHaveLength(1); expect(report.orphanedPlaylistReferences).toHaveLength(1); expect(report.orphanedQueueReferences).toEqual(["gone"]); expect(report.orphanedPlaybackEvents).toEqual(["gone-event"]); expect((await db.playlists.get("list"))?.trackIds).toContain("gone");
  });
  it("clears only selected cache/history data and repairs references only after an explicit maintenance call", async () => {
    const track = makeTrack({ waveform: new Uint8Array([1, 2, 3]), lastPlayedAt: 2, playCount: 7 }); await db.tracks.put(track); await db.playlists.put({ id: "list", name: "Local", trackIds: [track.id, "gone"], createdAt: 1, updatedAt: 1 }); await db.queues.put({ id: "primary", trackIds: [track.id, "gone"], updatedAt: 1 }); await db.playbackEvents.put({ id: "gone-event", type: "play", timestamp: 1, trackId: "gone" });
    await clearWaveformCache(); expect((await db.tracks.get(track.id))?.waveform).toBeUndefined(); expect((await db.tracks.get(track.id))?.audioBlob.size).toBe(track.audioBlob.size);
    await removeOrphanedReferences(); expect((await db.playlists.get("list"))?.trackIds).toEqual([track.id]); expect((await db.queues.get("primary"))?.trackIds).toEqual([track.id]); expect(await db.playbackEvents.count()).toBe(0);
    await clearListeningHistory(); expect((await db.tracks.get(track.id))?.playCount).toBe(0); expect((await db.tracks.get(track.id))?.lastPlayedAt).toBeUndefined();
  });
});
