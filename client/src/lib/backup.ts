/** Quiet Analog Atelier: all backup archives are built, validated, and restored locally; no library media leaves the browser. */
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { db, notifyLibraryChanged, notifyPlaybackChanged } from "@/lib/database";
import type { MusicTrack, PlaybackEvent, Playlist, Preference, QueueRecord } from "@/types/music";

export const BACKUP_SCHEMA_VERSION = 1;
const BACKUP_FORMAT = "mimusik-backup";
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;

export type RestoreStrategy = "merge" | "replace";
export interface BackupProgress { stage: "reading" | "packing" | "validating" | "restoring"; completed: number; total: number; label: string; }
export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  createdAt: number;
  appVersion: string;
  migration: { minimumReaderVersion: number; notes: string[] };
  counts: { tracks: number; playlists: number; playbackEvents: number; preferences: number };
  integrity: { algorithm: "SHA-256"; files: Record<string, string> };
}
export interface BackupTrackRecord extends Omit<MusicTrack, "audioBlob" | "coverBlob" | "waveform"> { audioFile: string; audioType: string; coverFile?: string; coverType?: string; waveformFile?: string; }
export interface BackupPayload { manifest: BackupManifest; tracks: BackupTrackRecord[]; playlists: Playlist[]; preferences: Preference[]; queue?: QueueRecord; playbackEvents: PlaybackEvent[]; }
export interface BackupPreview { manifest: BackupManifest; size: number; tracks: number; playlists: number; historyEvents: number; preferences: number; conflicts: { duplicateTracks: number; playlistIdConflicts: number; playlistNameConflicts: number; queuePresent: boolean }; warnings: string[]; }
export interface ParsedBackup { preview: BackupPreview; payload: BackupPayload; files: Record<string, Uint8Array>; }
export interface RestoreResult { restoredTracks: number; skippedTracks: number; restoredPlaylists: number; skippedPlaylists: number; restoredEvents: number; errors: Array<{ item: string; reason: string }>; }

const toBase64 = (bytes: ArrayBuffer) => { const data = new Uint8Array(bytes); let binary = ""; for (let index = 0; index < data.length; index += 1) binary += String.fromCharCode(data[index]); return btoa(binary); };
const fromJson = <T>(bytes: Uint8Array): T => JSON.parse(strFromU8(bytes)) as T;
const toJson = (value: unknown) => strToU8(JSON.stringify(value));
const abortError = () => new DOMException("Operation cancelled", "AbortError");
const sanitizePath = (value: string) => encodeURIComponent(value).replace(/%/g, "_");

async function hash(bytes: Uint8Array) { return toBase64(await crypto.subtle.digest("SHA-256", bytes)); }

function isBackupManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<BackupManifest>;
  return manifest.format === BACKUP_FORMAT && typeof manifest.schemaVersion === "number" && typeof manifest.createdAt === "number" && Boolean(manifest.counts) && Boolean(manifest.integrity?.files);
}

function validatePayload(payload: BackupPayload, files: Record<string, Uint8Array>) {
  const errors: string[] = [];
  if (!isBackupManifest(payload.manifest)) errors.push("The backup manifest is invalid.");
  if (payload.manifest.schemaVersion > BACKUP_SCHEMA_VERSION) errors.push("This backup was created by a newer MiMusik version.");
  if (!Array.isArray(payload.tracks) || !Array.isArray(payload.playlists) || !Array.isArray(payload.preferences) || !Array.isArray(payload.playbackEvents)) errors.push("The backup data structure is incomplete.");
  for (const track of payload.tracks ?? []) {
    if (!track.id || !track.fingerprint || !track.audioFile || !files[track.audioFile]) errors.push(`Track ${track.title || track.id || "unknown"} is missing its audio file.`);
    if (track.coverFile && !files[track.coverFile]) errors.push(`Track ${track.title || track.id || "unknown"} is missing its artwork file.`);
    if (track.waveformFile && !files[track.waveformFile]) errors.push(`Track ${track.title || track.id || "unknown"} is missing its waveform data.`);
  }
  return errors;
}

async function validateIntegrity(manifest: BackupManifest, files: Record<string, Uint8Array>, onProgress?: (progress: BackupProgress) => void, signal?: AbortSignal) {
  const entries = Object.entries(manifest.integrity.files); const errors: string[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    if (signal?.aborted) throw abortError();
    const [path, expected] = entries[index]; const data = files[path];
    onProgress?.({ stage: "validating", completed: index + 1, total: entries.length, label: path });
    if (!data) { errors.push(`Missing archive entry: ${path}`); continue; }
    if ((await hash(data)) !== expected) errors.push(`Integrity check failed for ${path}`);
  }
  return errors;
}

export async function createBackup(onProgress?: (progress: BackupProgress) => void, signal?: AbortSignal) {
  const [tracks, playlists, preferences, queue, playbackEvents] = await Promise.all([db.tracks.toArray(), db.playlists.toArray(), db.preferences.toArray(), db.queues.get("primary"), db.playbackEvents.toArray()]);
  const files: Record<string, Uint8Array> = {}; const backupTracks: BackupTrackRecord[] = []; const total = tracks.length * 3 + 1; let completed = 0;
  for (const track of tracks) {
    if (signal?.aborted) throw abortError();
    const base = `media/${sanitizePath(track.id)}`; const audioFile = `${base}.audio`; const audioBytes = new Uint8Array(await track.audioBlob.arrayBuffer()); files[audioFile] = audioBytes;
    const record: BackupTrackRecord = { ...track, audioBlob: undefined, coverBlob: undefined, waveform: undefined, audioFile, audioType: track.audioBlob.type || "application/octet-stream" } as BackupTrackRecord;
    delete (record as Partial<MusicTrack>).audioBlob; delete (record as Partial<MusicTrack>).coverBlob; delete (record as Partial<MusicTrack>).waveform;
    completed += 1; onProgress?.({ stage: "reading", completed, total, label: track.title });
    if (track.coverBlob) { const coverFile = `${base}.cover`; files[coverFile] = new Uint8Array(await track.coverBlob.arrayBuffer()); record.coverFile = coverFile; record.coverType = track.coverBlob.type || "image/jpeg"; completed += 1; onProgress?.({ stage: "reading", completed, total, label: `${track.title} artwork` }); }
    if (track.waveform?.length) { const waveformFile = `${base}.waveform`; files[waveformFile] = track.waveform; record.waveformFile = waveformFile; completed += 1; onProgress?.({ stage: "reading", completed, total, label: `${track.title} waveform` }); }
    backupTracks.push(record);
  }
  const payload: Omit<BackupPayload, "manifest"> = { tracks: backupTracks, playlists, preferences, queue, playbackEvents };
  files["library.json"] = toJson(payload);
  const integrityFiles: Record<string, string> = {};
  const fileEntries = Object.entries(files);
  for (let index = 0; index < fileEntries.length; index += 1) { if (signal?.aborted) throw abortError(); const [path, bytes] = fileEntries[index]; integrityFiles[path] = await hash(bytes); onProgress?.({ stage: "packing", completed: index + 1, total: fileEntries.length, label: path }); }
  const manifest: BackupManifest = { format: BACKUP_FORMAT, schemaVersion: BACKUP_SCHEMA_VERSION, createdAt: Date.now(), appVersion: "3.0.0", migration: { minimumReaderVersion: 1, notes: ["Blob-backed audio, artwork, and compact waveform arrays are stored as archive entries."] }, counts: { tracks: tracks.length, playlists: playlists.length, playbackEvents: playbackEvents.length, preferences: preferences.length }, integrity: { algorithm: "SHA-256", files: integrityFiles } };
  files["manifest.json"] = toJson(manifest);
  return new Blob([zipSync(files, { level: 6 })], { type: "application/vnd.mimusik.backup+zip" });
}

export async function parseBackup(file: File, onProgress?: (progress: BackupProgress) => void, signal?: AbortSignal): Promise<ParsedBackup> {
  if (!file.name.toLowerCase().endsWith(".mimusik")) throw new Error("Choose a .mimusik backup file.");
  if (!file.size) throw new Error("The selected backup is empty.");
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error("This backup is larger than the browser safety limit.");
  onProgress?.({ stage: "reading", completed: 0, total: 1, label: "Reading archive" });
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(new Uint8Array(await file.arrayBuffer())); } catch { throw new Error("The backup archive is corrupt or not a valid MiMusik file."); }
  const manifestBytes = files["manifest.json"]; const libraryBytes = files["library.json"];
  if (!manifestBytes || !libraryBytes) throw new Error("The backup is incomplete: manifest or library data is missing.");
  let manifest: BackupManifest; let library: Omit<BackupPayload, "manifest">;
  try { manifest = fromJson<BackupManifest>(manifestBytes); library = fromJson<Omit<BackupPayload, "manifest">>(libraryBytes); } catch { throw new Error("The backup metadata cannot be read."); }
  const payload: BackupPayload = { manifest, ...library }; const structuralErrors = validatePayload(payload, files); if (structuralErrors.length) throw new Error(structuralErrors[0]);
  const integrityErrors = await validateIntegrity(manifest, files, onProgress, signal); if (integrityErrors.length) throw new Error(integrityErrors[0]);
  const [currentTracks, currentPlaylists, currentQueue] = await Promise.all([db.tracks.toArray(), db.playlists.toArray(), db.queues.get("primary")]);
  const fingerprintSet = new Set(currentTracks.map((track) => track.fingerprint)); const playlistIdSet = new Set(currentPlaylists.map((playlist) => playlist.id)); const playlistNameSet = new Set(currentPlaylists.map((playlist) => playlist.name.trim().toLocaleLowerCase()));
  const warnings: string[] = []; if (manifest.counts.tracks !== payload.tracks.length) warnings.push("Track count does not match the manifest."); if (payload.playlists.some((playlist) => playlist.trackIds.some((id) => !payload.tracks.some((track) => track.id === id)))) warnings.push("One or more playlists reference tracks not present in the backup.");
  const preview: BackupPreview = { manifest, size: file.size, tracks: payload.tracks.length, playlists: payload.playlists.length, historyEvents: payload.playbackEvents.length, preferences: payload.preferences.length, conflicts: { duplicateTracks: payload.tracks.filter((track) => fingerprintSet.has(track.fingerprint)).length, playlistIdConflicts: payload.playlists.filter((playlist) => playlistIdSet.has(playlist.id)).length, playlistNameConflicts: payload.playlists.filter((playlist) => playlistNameSet.has(playlist.name.trim().toLocaleLowerCase())).length, queuePresent: Boolean(currentQueue?.trackIds.length) }, warnings };
  return { preview, payload, files };
}

function hydrateTrack(record: BackupTrackRecord, files: Record<string, Uint8Array>): MusicTrack {
  const { audioFile, audioType, coverFile, coverType, waveformFile, ...track } = record;
  return { ...track, audioBlob: new Blob([files[audioFile]], { type: audioType }), coverBlob: coverFile ? new Blob([files[coverFile]], { type: coverType || "image/jpeg" }) : undefined, waveform: waveformFile ? new Uint8Array(files[waveformFile]) : undefined };
}

export async function restoreBackup(archive: ParsedBackup, strategy: RestoreStrategy, onProgress?: (progress: BackupProgress) => void, signal?: AbortSignal): Promise<RestoreResult> {
  const { payload, files } = archive; const result: RestoreResult = { restoredTracks: 0, skippedTracks: 0, restoredPlaylists: 0, skippedPlaylists: 0, restoredEvents: 0, errors: [] }; const total = payload.tracks.length + payload.playlists.length + payload.playbackEvents.length + payload.preferences.length + 1; let completed = 0;
  await db.transaction("rw", db.tracks, db.playlists, db.preferences, db.queues, db.playbackEvents, async () => {
    if (strategy === "replace") { await Promise.all([db.playbackEvents.clear(), db.queues.clear(), db.preferences.clear(), db.playlists.clear(), db.tracks.clear()]); }
    const fingerprints = new Set((strategy === "merge" ? await db.tracks.toArray() : []).map((track) => track.fingerprint)); const playlistIds = new Set((strategy === "merge" ? await db.playlists.toArray() : []).map((playlist) => playlist.id));
    for (const record of payload.tracks) { if (signal?.aborted) throw abortError(); if (strategy === "merge" && fingerprints.has(record.fingerprint)) { result.skippedTracks += 1; result.errors.push({ item: record.title, reason: "Duplicate audio fingerprint" }); } else { await db.tracks.put(hydrateTrack(record, files)); fingerprints.add(record.fingerprint); result.restoredTracks += 1; } completed += 1; onProgress?.({ stage: "restoring", completed, total, label: record.title }); }
    const restoredTrackIds = new Set((await db.tracks.toArray()).map((track) => track.id));
    for (const playlist of payload.playlists) { if (signal?.aborted) throw abortError(); const validTrackIds = playlist.trackIds.filter((id) => restoredTrackIds.has(id)); if (strategy === "merge" && playlistIds.has(playlist.id)) { result.skippedPlaylists += 1; result.errors.push({ item: playlist.name, reason: "Playlist identifier already exists" }); } else { await db.playlists.put({ ...playlist, trackIds: validTrackIds, updatedAt: Date.now() }); playlistIds.add(playlist.id); result.restoredPlaylists += 1; } completed += 1; onProgress?.({ stage: "restoring", completed, total, label: playlist.name }); }
    for (const preference of payload.preferences) { if (signal?.aborted) throw abortError(); if (strategy === "replace" || !(await db.preferences.get(preference.key))) await db.preferences.put(preference); completed += 1; onProgress?.({ stage: "restoring", completed, total, label: "Preference" }); }
    if (payload.queue && (strategy === "replace" || !(await db.queues.get("primary")))) await db.queues.put({ ...payload.queue, trackIds: payload.queue.trackIds.filter((id) => restoredTrackIds.has(id)), updatedAt: Date.now() });
    for (const event of payload.playbackEvents) { if (signal?.aborted) throw abortError(); if (!event.trackId || restoredTrackIds.has(event.trackId)) { await db.playbackEvents.put(event); result.restoredEvents += 1; } completed += 1; onProgress?.({ stage: "restoring", completed, total, label: "Listening history" }); }
  });
  notifyLibraryChanged(); notifyPlaybackChanged(); return result;
}

export function backupFileName(timestamp = new Date()) { return `mimusik-${timestamp.toISOString().slice(0, 10)}.mimusik`; }
