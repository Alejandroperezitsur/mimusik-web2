type ArtworkEntry = { url: string; references: number; releaseTimer?: ReturnType<typeof setTimeout> };

const artworkUrls = new WeakMap<Blob, ArtworkEntry>();
const RELEASE_GRACE_MS = 1_200;

export function retainArtworkUrl(blob: Blob | undefined): string | undefined {
  if (!blob || blob.size === 0 || typeof URL === "undefined" || !URL.createObjectURL) return undefined;
  const existing = artworkUrls.get(blob);
  if (existing) {
    existing.references += 1;
    if (existing.releaseTimer) clearTimeout(existing.releaseTimer);
    existing.releaseTimer = undefined;
    return existing.url;
  }

  const entry: ArtworkEntry = { url: URL.createObjectURL(blob), references: 1 };
  artworkUrls.set(blob, entry);
  return entry.url;
}

export function releaseArtworkUrl(blob: Blob | undefined) {
  if (!blob) return;
  const entry = artworkUrls.get(blob);
  if (!entry) return;
  entry.references = Math.max(0, entry.references - 1);
  if (entry.references > 0 || entry.releaseTimer) return;
  entry.releaseTimer = setTimeout(() => {
    const current = artworkUrls.get(blob);
    if (!current || current.references > 0) return;
    URL.revokeObjectURL(current.url);
    artworkUrls.delete(blob);
  }, RELEASE_GRACE_MS);
}

export const artworkUrlReleaseGraceMs = RELEASE_GRACE_MS;
