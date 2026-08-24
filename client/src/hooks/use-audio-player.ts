/** Quiet Analog Atelier: this hook is the sole coordinator between durable player intent, audio events, and track records. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "@/lib/audio-engine";
import { db, notifyLibraryChanged, recordPlaybackEvent } from "@/lib/database";
import { usePlayerStore } from "@/store/player-store";
import type { MusicTrack } from "@/types/music";

export function useAudioPlayer(tracks: MusicTrack[]) {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string>();
  const sessionSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const store = usePlayerStore();
  const currentTrack = useMemo(() => tracks.find((track) => track.id === store.currentTrackId), [tracks, store.currentTrackId]);

  const persistSession = useCallback((type: "pause" | "completed") => {
    const trackId = usePlayerStore.getState().currentTrackId;
    const listenedSeconds = Math.round(sessionSecondsRef.current);
    if (trackId) void recordPlaybackEvent(type, { trackId, position: engineRef.current?.currentTime ?? 0, duration: engineRef.current?.duration ?? 0, listenedSeconds });
    sessionSecondsRef.current = 0;
  }, []);

  const setTrack = useCallback(async (track: MusicTrack, queue: MusicTrack[] = tracks, shouldPlay = true) => {
    const engine = engineRef.current; if (!engine) return;
    setPlaybackError(undefined);
    const currentId = usePlayerStore.getState().currentTrackId;
    if (engine.isPlaying && currentId && currentId !== track.id) { persistSession("pause"); void recordPlaybackEvent("skip", { trackId: currentId, position: engine.currentTime, duration: engine.duration }); }
    const token = engine.load(track, 0);
    store.setCurrentTrack(track.id); setPosition(0); setDuration(track.duration); lastTimeRef.current = 0;
    await store.replaceQueue(queue.map(({ id }) => id));
    if (!shouldPlay || !engine.isCurrent(token)) return;
    try {
      await engine.play();
      if (!engine.isCurrent(token)) return;
      await db.tracks.update(track.id, { lastPlayedAt: Date.now(), playCount: track.playCount + 1 });
      notifyLibraryChanged();
    } catch {
      if (engine.isCurrent(token)) setPlaybackError("This file could not begin playback. It may use an unsupported codec or be corrupted.");
    }
  }, [persistSession, store, tracks]);

  const move = useCallback(async (direction: 1 | -1) => {
    const state = usePlayerStore.getState(); const ids = state.queueIds.length ? state.queueIds : tracks.map(({ id }) => id); if (!ids.length) return;
    const currentIndex = Math.max(0, ids.indexOf(state.currentTrackId ?? "")); let nextIndex = currentIndex + direction;
    if (state.shuffle && ids.length > 1) { nextIndex = Math.floor(Math.random() * ids.length); if (nextIndex === currentIndex) nextIndex = (nextIndex + 1) % ids.length; }
    if (nextIndex < 0 || nextIndex >= ids.length) { if (state.repeatMode !== "all") return; nextIndex = nextIndex < 0 ? ids.length - 1 : 0; }
    const queue = ids.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as MusicTrack[];
    const next = queue.find((track) => track.id === ids[nextIndex]); if (next) await setTrack(next, queue);
  }, [setTrack, tracks]);

  const togglePlayback = useCallback(async () => {
    const engine = engineRef.current; if (!engine) return;
    if (!currentTrack) { if (tracks[0]) await setTrack(tracks[0], tracks); return; }
    if (engine.isPlaying) engine.pause();
    else { try { setPlaybackError(undefined); await engine.play(); } catch { setPlaybackError("Playback needs a supported local audio file and a browser interaction."); } }
  }, [currentTrack, setTrack, tracks]);

  const seek = useCallback((time: number) => { const engine = engineRef.current; if (!engine) return; engine.seek(time); setPosition(time); store.setCurrentTime(time); void recordPlaybackEvent("seek", { trackId: usePlayerStore.getState().currentTrackId, position: time, duration: engine.duration }); }, [store]);

  useEffect(() => {
    const engine = new AudioEngine(); engineRef.current = engine; engine.setVolume(store.volume); engine.setMuted(store.muted); void store.hydrateQueue();
    const unsubscribers = [
      engine.on("time", () => { const time = engine.currentTime; const delta = time - lastTimeRef.current; if (engine.isPlaying && delta > 0 && delta < 3) sessionSecondsRef.current += delta; lastTimeRef.current = time; setPosition(time); if (Math.floor(time) % 2 === 0) store.setCurrentTime(time); }),
      engine.on("loaded", () => { setDuration(engine.duration); setPosition(engine.currentTime); }),
      engine.on("play", () => { lastTimeRef.current = engine.currentTime; setIsPlaying(true); const trackId = usePlayerStore.getState().currentTrackId; if (trackId) void recordPlaybackEvent("play", { trackId, position: engine.currentTime, duration: engine.duration }); }),
      engine.on("pause", () => { setIsPlaying(false); if (engine.currentTime > 0 && engine.currentTime < engine.duration) persistSession("pause"); }),
      engine.on("error", () => { setIsPlaying(false); setPlaybackError("This local file cannot be decoded by this browser."); }),
      engine.on("ended", () => { persistSession("completed"); const state = usePlayerStore.getState(); if (state.repeatMode === "one") { engine.seek(0); void engine.play(); } else void move(1); }),
    ];
    return () => { unsubscribers.forEach((unsubscribe) => unsubscribe()); engine.destroy(); engineRef.current = null; };
  }, []);
  useEffect(() => { engineRef.current?.setVolume(store.volume); }, [store.volume]);
  useEffect(() => { engineRef.current?.setMuted(store.muted); }, [store.muted]);
  useEffect(() => { const restore = async () => { const engine = engineRef.current; if (!store.currentTrackId || !tracks.length || !engine) return; const saved = tracks.find((track) => track.id === store.currentTrackId); if (saved && !engine.isPlaying && !engine.currentTime) { engine.load(saved, store.currentTime); setPosition(store.currentTime); setDuration(saved.duration); } }; void restore(); }, [tracks]);
  useEffect(() => { const onKeydown = (event: KeyboardEvent) => { const target = event.target as HTMLElement | null; if (target?.matches("input, textarea, [contenteditable='true']")) return; if (event.code === "Space") { event.preventDefault(); void togglePlayback(); } if (event.key === "ArrowRight") { event.preventDefault(); seek((engineRef.current?.currentTime ?? 0) + 5); } if (event.key === "ArrowLeft") { event.preventDefault(); seek((engineRef.current?.currentTime ?? 0) - 5); } }; window.addEventListener("keydown", onKeydown); return () => window.removeEventListener("keydown", onKeydown); }, [seek, togglePlayback]);
  return { currentTrack, isPlaying, position, duration, setTrack, togglePlayback, next: () => move(1), previous: () => move(-1), seek, playbackError, clearPlaybackError: () => setPlaybackError(undefined), engine: engineRef };
}
