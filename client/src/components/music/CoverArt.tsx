/** Quiet Analog Atelier: cover art uses album sleeves, tonal fallbacks, and careful URL cleanup. */
import { useEffect, useState } from "react";
import { Disc3 } from "lucide-react";
import { releaseArtworkUrl, retainArtworkUrl } from "@/lib/artwork-url";
import type { MusicTrack } from "@/types/music";

export function CoverArt({ track, className = "", priority = false }: { track?: Pick<MusicTrack, "coverBlob" | "title" | "artist">; className?: string; priority?: boolean }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const coverBlob = track?.coverBlob;
  const label = track ? `Cover art for ${track.title} by ${track.artist}` : "MiMusik artwork placeholder";

  useEffect(() => {
    setFailed(false);
    const next = retainArtworkUrl(coverBlob);
    setUrl(next);
    return () => releaseArtworkUrl(coverBlob);
  }, [coverBlob]);

  if (!url || failed) return <div className={`cover-art-fallback ${className}`} role="img" aria-label={label}><Disc3 aria-hidden="true" size={24} /></div>;
  return <img className={`object-cover ${className}`} src={url} alt={label} loading={priority ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />;
}
