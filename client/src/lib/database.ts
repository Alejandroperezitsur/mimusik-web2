/** Quiet Analog Atelier: Dexie owns durable local music, queue, statistics, and preference records. */
import Dexie, { type EntityTable } from "dexie";
import type { MusicTrack, PlaybackEvent, PlaybackEventType, Playlist, Preference, QueueRecord } from "@/types/music";

class MiMusikDatabase extends Dexie {
  tracks!: EntityTable<MusicTrack, "id">;
  playlists!: EntityTable<Playlist, "id">;
  preferences!: EntityTable<Preference, "key">;
  queues!: EntityTable<QueueRecord, "id">;
  playbackEvents!: EntityTable<PlaybackEvent, "id">;

  constructor() {
    super("mimusik-offline-library");
    this.version(1).stores({
      tracks: "id, fingerprint, title, artist, album, addedAt, lastPlayedAt, isFavorite, [artist+album]",
      playlists: "id, name, updatedAt",
      preferences: "key",
    });
    this.version(2).stores({
      tracks: "id, fingerprint, title, artist, album, addedAt, lastPlayedAt, isFavorite, [artist+album]",
      playlists: "id, name, updatedAt",
      preferences: "key",
      queues: "id, updatedAt",
      playbackEvents: "id, type, timestamp, trackId, playlistId, [timestamp+type]",
    });
    this.version(3).stores({
      tracks: "id, fingerprint, title, artist, album, addedAt, lastPlayedAt, isFavorite, waveformVersion, [artist+album]",
      playlists: "id, name, updatedAt",
      preferences: "key",
      queues: "id, updatedAt",
      playbackEvents: "id, type, timestamp, trackId, playlistId, [timestamp+type]",
    });
  }
}

export const db = new MiMusikDatabase();
const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function notifyLibraryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mimusik:library-changed"));
}

export function notifyPlaybackChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mimusik:playback-changed"));
}

export async function toggleFavorite(trackId: string) {
  const track = await db.tracks.get(trackId);
  if (!track) return;
  await db.tracks.update(trackId, { isFavorite: !track.isFavorite });
  notifyLibraryChanged();
}

export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  const record = await db.preferences.get(key);
  return (record?.value as T | undefined) ?? fallback;
}

export async function setPreference<T>(key: string, value: T) {
  await db.preferences.put({ key, value });
}

export async function readQueue(): Promise<string[]> {
  return (await db.queues.get("primary"))?.trackIds ?? [];
}

export async function saveQueue(trackIds: string[]) {
  await db.queues.put({ id: "primary", trackIds, updatedAt: Date.now() });
  notifyPlaybackChanged();
}

export async function recordPlaybackEvent(type: PlaybackEventType, details: Omit<PlaybackEvent, "id" | "type" | "timestamp"> = {}) {
  await db.playbackEvents.add({ id: id(), type, timestamp: Date.now(), ...details });
  notifyPlaybackChanged();
}
