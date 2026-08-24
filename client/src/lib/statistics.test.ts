import { describe, expect, it } from "vitest";
import { calculateListeningStats } from "./statistics";
import { makeTrack } from "@/test/helpers";

describe("local listening statistics", () => {
  it("derives top track, artist, album, activity, and listening time from local events", () => {
    const first = makeTrack(); const second = makeTrack({ id: "track-2", title: "Small Hours", artist: "Field Notes", album: "Blue Room" });
    const stats = calculateListeningStats([{ id: "one", type: "play", timestamp: Date.UTC(2026, 0, 1), trackId: first.id }, { id: "two", type: "pause", timestamp: Date.UTC(2026, 0, 1), trackId: first.id, listenedSeconds: 85 }, { id: "three", type: "play", timestamp: Date.UTC(2026, 0, 2), trackId: second.id }, { id: "four", type: "completed", timestamp: Date.UTC(2026, 0, 2), trackId: second.id, listenedSeconds: 40 }], [first, second]);
    expect(stats.totalSeconds).toBe(125); expect(stats.tracksPlayed).toBe(2); expect(stats.topTrack?.track.id).toBe(first.id); expect(stats.topArtist?.name).toBe(first.artist); expect(stats.topAlbum?.name).toBe(first.album); expect(stats.activity).toHaveLength(2);
  });
});
