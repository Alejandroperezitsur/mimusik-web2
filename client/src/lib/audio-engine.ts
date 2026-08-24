/** Quiet Analog Atelier: one guarded browser audio engine owns media URLs, analysis, and cleanup. */
import type { MusicTrack } from "@/types/music";

export type EngineEvent = "time" | "play" | "pause" | "ended" | "loaded" | "error";
type Listener = () => void;

export class AudioEngine {
  private audio = new Audio();
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: MediaElementAudioSourceNode;
  private currentUrl?: string;
  private pendingStartAt = 0;
  private generation = 0;
  private listeners = new Map<EngineEvent, Set<Listener>>();

  constructor() {
    this.audio.preload = "metadata";
    this.audio.addEventListener("timeupdate", () => this.emit("time"));
    this.audio.addEventListener("play", () => this.emit("play"));
    this.audio.addEventListener("pause", () => this.emit("pause"));
    this.audio.addEventListener("ended", () => this.emit("ended"));
    this.audio.addEventListener("loadedmetadata", () => {
      if (this.pendingStartAt > 0 && Number.isFinite(this.audio.duration)) this.audio.currentTime = Math.min(this.pendingStartAt, Math.max(0, this.audio.duration - 0.05));
      this.pendingStartAt = 0;
      this.emit("loaded");
    });
    this.audio.addEventListener("error", () => this.emit("error"));
  }

  on(event: EngineEvent, listener: Listener) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener); this.listeners.set(event, listeners);
    return () => listeners.delete(listener);
  }

  private emit(event: EngineEvent) { this.listeners.get(event)?.forEach((listener) => listener()); }

  load(track: MusicTrack, startAt = 0) {
    const token = ++this.generation;
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    this.currentUrl = URL.createObjectURL(track.audioBlob);
    this.pendingStartAt = Math.max(0, startAt);
    this.audio.src = this.currentUrl;
    this.audio.load();
    return token;
  }

  isCurrent(token: number) { return token === this.generation; }

  async play() {
    this.ensureAnalyser();
    if (this.context?.state === "suspended") await this.context.resume();
    await this.audio.play();
  }

  pause() { this.audio.pause(); }
  seek(value: number) { if (Number.isFinite(value)) this.audio.currentTime = Math.min(Math.max(0, value), this.duration || Math.max(0, value)); }
  setVolume(value: number) { this.audio.volume = Math.min(1, Math.max(0, value)); }
  setMuted(value: boolean) { this.audio.muted = value; }
  get currentTime() { return this.audio.currentTime || 0; }
  get duration() { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
  get isPlaying() { return !this.audio.paused; }
  getFrequencyData() { if (!this.analyser) return new Uint8Array(12); const data = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(data); return data; }

  private ensureAnalyser() {
    if (this.context) return;
    this.context = new AudioContext(); this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 128; this.analyser.smoothingTimeConstant = 0.82;
    this.source = this.context.createMediaElementSource(this.audio); this.source.connect(this.analyser); this.analyser.connect(this.context.destination);
  }

  destroy() {
    ++this.generation; this.audio.pause(); this.audio.removeAttribute("src"); this.audio.load();
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    this.currentUrl = undefined; this.listeners.clear(); void this.context?.close(); this.context = undefined;
  }
}
