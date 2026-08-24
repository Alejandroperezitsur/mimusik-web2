/** Quiet Analog Atelier: imports validate each file, avoid duplicate blobs, and recover per-file without aborting the batch. */
import { db, notifyLibraryChanged } from "@/lib/database";
import { readDuration, readMetadata } from "@/lib/metadata";
import { createWaveformCache, WAVEFORM_VERSION } from "@/lib/waveform-cache";
import type { ImportProgress, MusicTrack } from "@/types/music";

const supportedExtensions = /\.(mp3|wav|ogg|flac|m4a|aac)$/i;
const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fallbackTitle = (filename: string) => filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim() || "Untitled track";
export const isSupportedAudioFile = (file: File) => file.type.startsWith("audio/") || supportedExtensions.test(file.name);
const importErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === "QuotaExceededError") return "Browser storage is full. Free space or export a backup before importing more music.";
  if (error instanceof DOMException && error.name === "AbortError") return "Import cancelled before this file was saved.";
  if (error instanceof Error && /metadata|audio/i.test(error.message)) return "This file could not be read as playable audio.";
  return "This file could not be imported. Try another copy or a supported audio format.";
};

export async function importAudioFiles(sourceFiles: File[], onProgress: (progress: ImportProgress) => void, signal?: AbortSignal): Promise<ImportProgress> {
  const progress: ImportProgress = { total: sourceFiles.length, completed: 0, imported: 0, skipped: 0, failed: [], cancelled: false };
  for (const file of sourceFiles) {
    if (signal?.aborted) { progress.cancelled = true; break; }
    if (!isSupportedAudioFile(file)) {
      progress.failed.push({ fileName: file.name, reason: "Unsupported audio format" }); progress.completed += 1; onProgress({ ...progress, failed: [...progress.failed] }); continue;
    }
    const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
    const exists = await db.tracks.where("fingerprint").equals(fingerprint).first();
    if (exists) { progress.skipped += 1; progress.completed += 1; onProgress({ ...progress, failed: [...progress.failed] }); continue; }
    try {
      const [metadata, duration] = await Promise.all([readMetadata(file), readDuration(file)]);
      if (!duration && file.size > 0) throw new Error("Browser could not read audio metadata");
      const waveform = await createWaveformCache(file, signal);
      const track: MusicTrack = { id: id(), fingerprint, title: metadata.title?.trim() || fallbackTitle(file.name), artist: metadata.artist?.trim() || "Unknown artist", album: metadata.album?.trim() || "Unsorted recordings", duration, format: file.name.split(".").pop()?.toUpperCase() || "AUDIO", audioBlob: file, coverBlob: metadata.coverBlob, waveform, waveformVersion: waveform ? WAVEFORM_VERSION : undefined, addedAt: Date.now(), playCount: 0, isFavorite: false };
      await db.tracks.put(track); progress.imported += 1;
    } catch (error) { progress.failed.push({ fileName: file.name, reason: importErrorMessage(error) }); }
    finally { progress.completed += 1; onProgress({ ...progress, failed: [...progress.failed] }); }
  }
  notifyLibraryChanged();
  return progress;
}
