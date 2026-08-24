/** Quiet Analog Atelier: collection actions persist immediately and keep playlist ordering deterministic. */
import { db, notifyLibraryChanged } from "@/lib/database";
import type { Playlist } from "@/types/music";

export async function savePlaylist(playlist: Playlist) {
  await db.playlists.put({ ...playlist, updatedAt: Date.now() });
  notifyLibraryChanged();
}

export function reorderIds(ids: string[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= ids.length || toIndex >= ids.length) return ids;
  const next = [...ids]; const [id] = next.splice(fromIndex, 1); next.splice(toIndex, 0, id); return next;
}
