/** Quiet Analog Atelier: a small reactive boundary keeps Dexie changes out of presentation components. */
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/database";
import type { MusicTrack, Playlist } from "@/types/music";
export function useLibrary() { const [tracks, setTracks] = useState<MusicTrack[]>([]); const [playlists, setPlaylists] = useState<Playlist[]>([]); const [loading, setLoading] = useState(true); const refresh = useCallback(async () => { const [nextTracks, nextPlaylists] = await Promise.all([db.tracks.orderBy("addedAt").reverse().toArray(), db.playlists.orderBy("updatedAt").reverse().toArray()]); setTracks(nextTracks); setPlaylists(nextPlaylists); setLoading(false); }, []); useEffect(() => { void refresh(); window.addEventListener("mimusik:library-changed", refresh); return () => window.removeEventListener("mimusik:library-changed", refresh); }, [refresh]); return { tracks, playlists, loading, refresh }; }
