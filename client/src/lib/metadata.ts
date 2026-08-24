/** Quiet Analog Atelier: metadata parsing is tolerant and loaded only when a local import needs it. */

export interface ParsedMetadata { title?: string; artist?: string; album?: string; coverBlob?: Blob; }

export async function readMetadata(file: File): Promise<ParsedMetadata> {
  try {
    const { parseBlob } = await import("music-metadata-browser");
    const metadata = await parseBlob(file);
    const picture = metadata.common.picture?.[0];
    return {
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      coverBlob: picture ? new Blob([picture.data], { type: picture.format || "image/jpeg" }) : undefined,
    };
  } catch {
    return {};
  }
}

export async function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const finish = (value: number) => { URL.revokeObjectURL(url); audio.remove(); resolve(Number.isFinite(value) ? value : 0); };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    audio.src = url;
  });
}
