/** Quiet Analog Atelier: music-domain contracts define durable local records independently of the UI. */
export type RepeatMode = "off" | "all" | "one";
export type PlaybackEventType = "play" | "pause" | "completed" | "skip" | "seek" | "playlist-play";

export interface MusicTrack {
  id: string;
  fingerprint: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  audioBlob: Blob;
  coverBlob?: Blob;
  waveform?: Uint8Array;
  waveformVersion?: number;
  addedAt: number;
  lastPlayedAt?: number;
  playCount: number;
  isFavorite: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface QueueRecord {
  id: "primary";
  trackIds: string[];
  updatedAt: number;
}

export interface PlaybackEvent {
  id: string;
  type: PlaybackEventType;
  timestamp: number;
  trackId?: string;
  playlistId?: string;
  position?: number;
  duration?: number;
  listenedSeconds?: number;
}

export interface Preference<T = unknown> { key: string; value: T; }
export interface ImportFailure { fileName: string; reason: string; }
export interface ImportProgress { total: number; completed: number; imported: number; skipped: number; failed: ImportFailure[]; cancelled: boolean; }

export const AUDIO_ACCEPT = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/flac", "audio/x-flac", "audio/mp4", "audio/aac"];
