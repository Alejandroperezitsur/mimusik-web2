import type { MusicTrack } from "@/types/music";

export function makeTrack(overrides: Partial<MusicTrack> = {}): MusicTrack {
  return { id: "track-1", fingerprint: "sample:1:1", title: "Local Signal", artist: "Quiet Unit", album: "Night Index", duration: 180, format: "MP3", audioBlob: new Blob(["audio"], { type: "audio/mpeg" }), addedAt: 1, playCount: 0, isFavorite: false, ...overrides };
}
