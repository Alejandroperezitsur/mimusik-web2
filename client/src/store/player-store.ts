/** Quiet Analog Atelier: Zustand is the live player state while the queue has a durable IndexedDB record. */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { readQueue, saveQueue } from "@/lib/database";
import type { RepeatMode } from "@/types/music";

interface PlayerState {
  queueIds: string[];
  queueHydrated: boolean;
  currentTrackId?: string;
  currentTime: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  hydrateQueue: () => Promise<void>;
  replaceQueue: (ids: string[]) => Promise<void>;
  addToQueue: (trackId: string, mode?: "next" | "end") => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;
  clearQueue: () => Promise<void>;
  setCurrentTrack: (id?: string) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const unique = (ids: string[]) => Array.from(new Set(ids));

export const usePlayerStore = create<PlayerState>()(persist(
  (set, get) => ({
    queueIds: [], queueHydrated: false, currentTrackId: undefined, currentTime: 0, volume: 0.78, muted: false, shuffle: false, repeatMode: "off",
    hydrateQueue: async () => { const queueIds = await readQueue(); set({ queueIds, queueHydrated: true }); },
    replaceQueue: async (ids) => { const queueIds = unique(ids); set({ queueIds, queueHydrated: true }); await saveQueue(queueIds); },
    addToQueue: async (trackId, mode = "end") => { const state = get(); const existing = state.queueIds.filter((id) => id !== trackId); const currentIndex = state.currentTrackId ? existing.indexOf(state.currentTrackId) : -1; const queueIds = mode === "next" ? [...existing.slice(0, currentIndex + 1), trackId, ...existing.slice(currentIndex + 1)] : [...existing, trackId]; set({ queueIds, queueHydrated: true }); await saveQueue(queueIds); },
    removeFromQueue: async (trackId) => { const queueIds = get().queueIds.filter((id) => id !== trackId); set({ queueIds, queueHydrated: true }); await saveQueue(queueIds); },
    reorderQueue: async (fromIndex, toIndex) => { const queueIds = [...get().queueIds]; if (fromIndex < 0 || toIndex < 0 || fromIndex >= queueIds.length || toIndex >= queueIds.length) return; const [trackId] = queueIds.splice(fromIndex, 1); queueIds.splice(toIndex, 0, trackId); set({ queueIds, queueHydrated: true }); await saveQueue(queueIds); },
    clearQueue: async () => { set({ queueIds: [], queueHydrated: true }); await saveQueue([]); },
    setCurrentTrack: (currentTrackId) => set({ currentTrackId, currentTime: 0 }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    setVolume: (volume) => set({ volume, muted: false }),
    setMuted: (muted) => set({ muted }),
    toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    cycleRepeat: () => set((state) => ({ repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off" })),
  }),
  { name: "mimusik-player-v2", partialize: (state) => ({ currentTrackId: state.currentTrackId, currentTime: state.currentTime, volume: state.volume, muted: state.muted, shuffle: state.shuffle, repeatMode: state.repeatMode }) },
));
