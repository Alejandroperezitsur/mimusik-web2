import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, readQueue, saveQueue, toggleFavorite } from "./database";
import { reorderIds, savePlaylist } from "./collection-actions";
import { makeTrack } from "@/test/helpers";

beforeEach(async () => { await db.open(); await Promise.all([db.tracks.clear(), db.playlists.clear(), db.preferences.clear(), db.queues.clear(), db.playbackEvents.clear()]); });

describe("offline persistence", () => {
  it("retains imported audio and embedded art as blobs", async () => {
    const coverBlob = new Blob(["cover"], { type: "image/png" }); const track = makeTrack({ coverBlob });
    await db.tracks.put(track); await db.close(); await db.open(); const stored = await db.tracks.get(track.id);
    expect(stored?.audioBlob.size).toBe(track.audioBlob.size); expect(stored?.coverBlob?.size).toBe(coverBlob.size);
  });
  it("persists favorites, queue order, and playlist reorder operations", async () => {
    const first = makeTrack(); const second = makeTrack({ id: "track-2", fingerprint: "sample:2:2" }); await db.tracks.bulkPut([first, second]);
    await toggleFavorite(first.id); expect((await db.tracks.get(first.id))?.isFavorite).toBe(true);
    await saveQueue([first.id, second.id]); await db.close(); await db.open(); expect(await readQueue()).toEqual([first.id, second.id]);
    const reordered = reorderIds([first.id, second.id], 0, 1); await savePlaylist({ id: "playlist-1", name: "Signal path", trackIds: reordered, createdAt: 1, updatedAt: 1 });
    expect((await db.playlists.get("playlist-1"))?.trackIds).toEqual([second.id, first.id]);
  });
});
