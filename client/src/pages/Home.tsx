import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BarChart3, ChevronRight, CirclePlus, Clock3, Command, Disc3, Download, FolderPlus, Heart, House, LibraryBig, ListMusic, Moon, Music2, Plus, Search, Settings2, Share, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { db, notifyLibraryChanged, toggleFavorite } from "@/lib/database";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useLibrary } from "@/hooks/use-library";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useTheme } from "@/contexts/ThemeContext";
import type { MusicTrack, Playlist } from "@/types/music";
import { CoverArt } from "@/components/music/CoverArt";
import { ImportDialog } from "@/components/music/ImportDialog";
import { AlbumIndex, ArtistIndex, type LibrarySection, RecentEmpty, TrackList } from "@/components/music/LibraryViews";
import { PlayerBar } from "@/components/music/PlayerBar";
import { QueueDrawer } from "@/components/music/QueueDrawer";
import "./phase2.css";
import "./responsive.css";
import "./mobile-ux.css";

const StatsPanel = lazy(() => import("@/components/music/StatsPanel").then((module) => ({ default: module.StatsPanel })));
const PlaylistWorkspace = lazy(() => import("@/components/music/PlaylistWorkspace").then((module) => ({ default: module.PlaylistWorkspace })));
const LibraryCarePanel = lazy(() => import("@/components/music/LibraryCarePanel").then((module) => ({ default: module.LibraryCarePanel })));
const navItems: Array<{ id: LibrarySection; label: string; icon: typeof Music2 }> = [{ id: "songs", label: "Songs", icon: Music2 }, { id: "albums", label: "Albums", icon: Disc3 }, { id: "artists", label: "Artists", icon: UserRound }, { id: "playlists", label: "Playlists", icon: ListMusic }];

function WorkspaceFallback({ label = "Opening workspace" }: { label?: string }) {
  return <section className="library-panel grid min-h-[46vh] place-items-center"><p className="eyebrow text-[#9FC8B4]">{label}</p></section>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const { tracks, playlists, loading } = useLibrary();
  const { currentTrack, isPlaying, position, duration, setTrack, togglePlayback, next, previous, seek, playbackError, clearPlaybackError, engine } = useAudioPlayer(tracks);
  const { theme, toggleTheme } = useTheme();
  const { installed, canPrompt, isIos, requestInstall } = usePwaInstall();
  const [section, setSection] = useState<LibrarySection>("songs");
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>();
  const [showIosInstall, setShowIosInstall] = useState(false);
  const statsMode = location === "/stats";
  const careMode = location === "/care";

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const searched = normalized ? tracks.filter((track) => [track.title, track.artist, track.album].some((value) => value.toLocaleLowerCase().includes(normalized))) : tracks;
    if (section === "favorites") return searched.filter((track) => track.isFavorite);
    if (section === "recent") return searched.filter((track) => Boolean(track.lastPlayedAt)).sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));
    return searched;
  }, [tracks, query, section]);

  const play = (track: MusicTrack, queue: MusicTrack[] = section === "favorites" || section === "recent" ? visibleTracks : tracks) => void setTrack(track, queue);
  const changeSection = (nextSection: LibrarySection) => { setLocation("/"); setSection(nextSection); if (nextSection !== "playlists") setSelectedPlaylistId(undefined); };
  const createPlaylist = async () => {
    const name = playlistName.trim();
    if (!name) { toast.message("Give this playlist a name first."); return; }
    const playlist: Playlist = { id: crypto.randomUUID?.() ?? `${Date.now()}`, name, trackIds: currentTrack ? [currentTrack.id] : [], createdAt: Date.now(), updatedAt: Date.now() };
    await db.playlists.add(playlist);
    notifyLibraryChanged();
    setPlaylistName("");
    setPlaylistOpen(false);
    setSection("playlists");
    setSelectedPlaylistId(playlist.id);
    toast.success(`“${name}” is ready.`);
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setShowSearch(true); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") { event.preventDefault(); changeSection("songs"); }
      if (event.key === "Escape") { setShowSearch(false); setQueueOpen(false); setShowIosInstall(false); }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!showSearch) return;
    const focusTimer = window.setTimeout(() => document.getElementById("mimusik-search")?.focus(), 40);
    return () => window.clearTimeout(focusTimer);
  }, [showSearch]);

  const sectionTitle = { songs: "Songs", albums: "Albums", artists: "Artists", playlists: "Playlists", favorites: "Favorites", recent: "Recently played" }[section];
  const mainContent = careMode ? <Suspense fallback={<WorkspaceFallback label="Opening library care" />}><LibraryCarePanel /></Suspense> : statsMode ? <Suspense fallback={<WorkspaceFallback label="Opening listening log" />}><StatsPanel tracks={tracks} /></Suspense> : <>{(section === "songs" || section === "favorites") && <TrackList tracks={visibleTracks} currentTrackId={currentTrack?.id} playing={isPlaying} onPlay={play} title={sectionTitle} subtitle={section === "favorites" ? "The recordings you marked to keep close." : loading ? "Opening your local collection…" : tracks.length ? "Every recording lives here, offline and on your own terms." : "Your personal collection begins with a first import."} />}{section === "recent" && (visibleTracks.length ? <TrackList tracks={visibleTracks} currentTrackId={currentTrack?.id} playing={isPlaying} onPlay={play} title="Recently played" subtitle="A record of the music you’ve returned to." /> : <section className="library-panel"><div className="library-heading"><div><p className="eyebrow">A small history</p><h1 className="font-display text-[clamp(2rem,4vw,3.65rem)] font-medium tracking-[-.05em]">Recently played</h1></div></div><RecentEmpty /></section>)}{section === "albums" && <AlbumIndex tracks={visibleTracks} onPlay={play} />}{section === "artists" && <ArtistIndex tracks={visibleTracks} onPlay={play} />}{section === "playlists" && <Suspense fallback={<WorkspaceFallback label="Opening playlists" />}><PlaylistWorkspace playlists={playlists} tracks={tracks} selectedId={selectedPlaylistId} onSelect={setSelectedPlaylistId} onCreate={() => setPlaylistOpen(true)} onPlay={play} /></Suspense>}</>;

  const installAction = async () => {
    if (canPrompt) {
      const outcome = await requestInstall();
      if (outcome === "accepted") toast.success("MiMusik is installing.");
      return;
    }
    if (isIos) setShowIosInstall(true);
  };

  return <main className="min-h-dvh bg-[#151918] text-[#EDEDE8]"><div className="app-grain" /><div className="app-shell"><aside className="sidebar"><div><div className="brand-lockup"><img src="/mimusik-mark.svg" alt="" className="brand-mark" /><span className="font-display text-xl tracking-[-.07em] text-[#F5F2EA]">MiMusik</span></div><button className="import-button" onClick={() => setImportOpen(true)}><FolderPlus size={17} />Import music</button><nav className="mt-8 space-y-1" aria-label="Library navigation"><p className="nav-caption">Library</p>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${!statsMode && !careMode && section === id ? "is-active" : ""}`} onClick={() => changeSection(id)}><Icon size={17} />{label}</button>)}</nav><nav className="mt-7 space-y-1" aria-label="Personal library"><p className="nav-caption">For you</p><button className={`nav-item ${!statsMode && !careMode && section === "favorites" ? "is-active" : ""}`} onClick={() => changeSection("favorites")}><Heart size={17} />Favorites</button><button className={`nav-item ${!statsMode && !careMode && section === "recent" ? "is-active" : ""}`} onClick={() => changeSection("recent")}><Clock3 size={17} />Recently played</button><button className={`nav-item ${statsMode ? "is-active" : ""}`} onClick={() => setLocation("/stats")}><BarChart3 size={17} />Listening log</button></nav></div><div className="sidebar-footer"><button className="nav-item" onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}{theme === "dark" ? "Light surface" : "Dark surface"}</button><button className={`nav-item ${careMode ? "is-active" : ""}`} onClick={() => setLocation("/care")}><Settings2 size={17} />Library care</button></div></aside><section className="workspace"><header className="topbar"><div className="mobile-brand lg:hidden"><img src="/mimusik-mark.svg" alt="" className="brand-mark" /><span className="font-display text-xl tracking-[-.07em]">MiMusik</span></div><button className="search-trigger hidden lg:flex" onClick={() => setShowSearch(true)}><Search size={17} /><span>Search your library</span><kbd className="hidden sm:inline-flex"><Command size={12} />K</kbd></button><div className="mobile-header-actions lg:hidden"><button className="search-trigger" onClick={() => setShowSearch(true)} aria-label="Search your library"><Search size={19} /></button>{!installed && (canPrompt || isIos) && <button className="top-icon" onClick={() => void installAction()} aria-label="Install MiMusik"><Download size={18} /></button>}<button className="top-icon" aria-label="Open library care" onClick={() => setLocation("/care")}><Settings2 size={18} /></button></div><div className="ml-auto hidden items-center gap-2 lg:flex"><button className="top-icon" aria-label="Open local listening statistics" onClick={() => setLocation("/stats")}><BarChart3 size={18} /></button><button className="top-icon" aria-label="Open playback queue" onClick={() => setQueueOpen(true)}><ListMusic size={18} /></button><button className="top-icon" onClick={() => setImportOpen(true)} aria-label="Import music"><CirclePlus size={20} /></button></div></header><div className="workspace-scroll"><motion.div key={`${careMode}-${statsMode}-${section}-${selectedPlaylistId ?? ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.19 }}>{mainContent}</motion.div></div><nav className="bottom-nav lg:hidden" aria-label="Mobile library navigation"><button className={section === "songs" && !statsMode && !careMode ? "is-active" : ""} onClick={() => changeSection("songs")}><House size={18} /><span>Library</span></button><button className={section === "albums" && !statsMode && !careMode ? "is-active" : ""} onClick={() => changeSection("albums")}><Disc3 size={18} /><span>Albums</span></button><button className="mobile-add" onClick={() => setImportOpen(true)} aria-label="Import music"><Plus size={20} /></button><button className={section === "playlists" && !statsMode && !careMode ? "is-active" : ""} onClick={() => changeSection("playlists")}><ListMusic size={18} /><span>Lists</span></button><button className={careMode ? "is-active" : ""} onClick={() => setLocation("/care")}><Settings2 size={18} /><span>Care</span></button></nav><PlayerBar track={currentTrack} playing={isPlaying} position={position} duration={duration} engineRef={engine} onToggle={() => void togglePlayback()} onNext={() => void next()} onPrevious={() => void previous()} onSeek={seek} onOpenQueue={() => setQueueOpen(true)} onToggleFavorite={() => { if (currentTrack) void toggleFavorite(currentTrack.id); }} /></section></div><ImportDialog open={importOpen} onClose={() => setImportOpen(false)} /><QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} tracks={tracks} currentTrackId={currentTrack?.id} playing={isPlaying} onPlay={play} />{playbackError && <div className="playback-alert" role="alert"><p>{playbackError}</p><button onClick={clearPlaybackError} aria-label="Dismiss playback error">×</button></div>}{showSearch && <div className="search-overlay mobile-search-overlay" onMouseDown={() => setShowSearch(false)}><div className="search-modal" onMouseDown={(event) => event.stopPropagation()}><Search className="text-[#8CB9A5]" size={20} /><input id="mimusik-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs, artists, albums" autoComplete="off" /><button onClick={() => setShowSearch(false)} className="text-xs text-[#B1B9B4]" aria-label="Close search">Close</button><div className="search-results">{query ? <><p className="eyebrow px-2 pt-3">Matching tracks</p>{visibleTracks.slice(0, 6).map((track) => <button key={track.id} onClick={() => { play(track); setShowSearch(false); }}><CoverArt track={track} className="size-9 rounded-lg" /><span className="min-w-0 text-left"><span className="block truncate text-sm text-[#F0EFE8]">{track.title}</span><span className="block truncate text-xs text-[#8F9993]">{track.artist}</span></span><ChevronRight className="ml-auto text-[#6E7873]" size={17} /></button>)}{!visibleTracks.length && <p className="px-2 py-6 text-sm text-[#89938D]">No local recordings match that search.</p>}</> : <p className="px-2 py-6 text-sm text-[#89938D]">Search works across music stored in this browser.</p>}</div></div></div>}{playlistOpen && <div className="search-overlay" onMouseDown={() => setPlaylistOpen(false)}><form className="search-modal playlist-form" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); void createPlaylist(); }}><LibraryBig className="text-[#8CB9A5]" size={20} /><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Name this playlist" autoFocus /><button type="submit" className="quiet-action">Create</button></form></div>}{showIosInstall && <section className="pwa-install-hint" role="dialog" aria-label="Install MiMusik on iPhone"><button className="absolute right-3 top-2 text-[#AAB4AE]" onClick={() => setShowIosInstall(false)} aria-label="Close install instructions">×</button><p className="eyebrow">Install MiMusik</p><p className="mt-2 text-sm leading-6 text-[#E9EEE9]">In Safari, tap <Share className="mx-1 inline" size={15} aria-label="Share" /> then choose <strong>Add to Home Screen</strong>.</p></section>}</main>;
}
