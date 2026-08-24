/** Quiet Analog Atelier: listening insight is derived from local event records—never a server-side profile. */
import type { MusicTrack, PlaybackEvent } from "@/types/music";

export interface ListeningStats {
  totalSeconds: number;
  tracksPlayed: number;
  topTrack?: { track: MusicTrack; seconds: number; plays: number };
  topArtist?: { name: string; seconds: number; plays: number };
  topAlbum?: { name: string; seconds: number; plays: number };
  topTracks: Array<{ track: MusicTrack; seconds: number; plays: number }>;
  topArtists: Array<{ name: string; seconds: number; plays: number }>;
  recent: PlaybackEvent[];
  activity: Array<{ day: string; seconds: number; plays: number }>;
}

const dayKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

export function calculateListeningStats(events: PlaybackEvent[], tracks: MusicTrack[]): ListeningStats {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const trackStats = new Map<string, { seconds: number; plays: number }>();
  const artistStats = new Map<string, { seconds: number; plays: number }>();
  const albumStats = new Map<string, { seconds: number; plays: number }>();
  const activity = new Map<string, { seconds: number; plays: number }>();
  let totalSeconds = 0;

  for (const event of events) {
    const track = event.trackId ? byId.get(event.trackId) : undefined;
    const seconds = Math.max(0, event.listenedSeconds ?? 0);
    const isPlay = event.type === "play";
    totalSeconds += seconds;
    const day = activity.get(dayKey(event.timestamp)) ?? { seconds: 0, plays: 0 };
    day.seconds += seconds; day.plays += isPlay ? 1 : 0; activity.set(dayKey(event.timestamp), day);
    if (!track) continue;
    const trackValue = trackStats.get(track.id) ?? { seconds: 0, plays: 0 };
    trackValue.seconds += seconds; trackValue.plays += isPlay ? 1 : 0; trackStats.set(track.id, trackValue);
    const artistValue = artistStats.get(track.artist) ?? { seconds: 0, plays: 0 };
    artistValue.seconds += seconds; artistValue.plays += isPlay ? 1 : 0; artistStats.set(track.artist, artistValue);
    const albumValue = albumStats.get(track.album) ?? { seconds: 0, plays: 0 };
    albumValue.seconds += seconds; albumValue.plays += isPlay ? 1 : 0; albumStats.set(track.album, albumValue);
  }

  const rank = <T>(items: T[], value: (item: T) => { seconds: number; plays: number }) => items.sort((a, b) => value(b).seconds - value(a).seconds || value(b).plays - value(a).plays);
  const topTracks = rank(Array.from(trackStats, ([id, value]) => ({ track: byId.get(id)!, ...value })).filter((item) => item.track), (item) => item).slice(0, 5);
  const topArtists = rank(Array.from(artistStats, ([name, value]) => ({ name, ...value })), (item) => item).slice(0, 5);
  const topAlbums = rank(Array.from(albumStats, ([name, value]) => ({ name, ...value })), (item) => item);
  const activityRows = Array.from(activity, ([day, value]) => ({ day, ...value })).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);

  return { totalSeconds, tracksPlayed: new Set(events.filter((event) => event.type === "play" && event.trackId).map((event) => event.trackId)).size, topTrack: topTracks[0], topArtist: topArtists[0], topAlbum: topAlbums[0], topTracks, topArtists, recent: [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8), activity: activityRows };
}

export function formatListeningTime(seconds: number) {
  const hours = Math.floor(seconds / 3600); const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
