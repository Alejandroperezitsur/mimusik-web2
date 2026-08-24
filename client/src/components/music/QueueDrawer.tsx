/** Quiet Analog Atelier: the queue is a durable, reorderable side instrument with a mobile bottom-sheet posture. */
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, ListX, Play, Trash2, X } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";
import type { MusicTrack } from "@/types/music";
import { CoverArt } from "./CoverArt";
import { SignalBars, formatDuration } from "./LibraryViews";

export function QueueDrawer({ open, onClose, tracks, currentTrackId, playing, onPlay }: { open: boolean; onClose: () => void; tracks: MusicTrack[]; currentTrackId?: string; playing: boolean; onPlay: (track: MusicTrack, queue: MusicTrack[]) => void }) {
  const queueIds = usePlayerStore((state) => state.queueIds);
  const reorderQueue = usePlayerStore((state) => state.reorderQueue);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const queue = queueIds.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as MusicTrack[];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; void reorderQueue(queueIds.indexOf(String(active.id)), queueIds.indexOf(String(over.id))); };
  return <AnimatePresence>{open && <div className="queue-overlay" onMouseDown={onClose}><motion.aside className="queue-drawer" initial={{ opacity: 0, x: 28, y: 28 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 28, y: 28 }} transition={{ duration: 0.2 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Playback queue"><header className="queue-header"><div><p className="eyebrow">Playback order</p><h2 className="font-display text-2xl text-[#F4F2EA]">Queue</h2></div><button className="icon-button" onClick={onClose} aria-label="Close queue"><X size={18} /></button></header>{queue.length ? <><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}><SortableContext items={queueIds} strategy={verticalListSortingStrategy}><div className="queue-list">{queue.map((track) => <QueueRow key={track.id} track={track} active={track.id === currentTrackId} playing={playing} onPlay={() => onPlay(track, queue)} onRemove={() => void removeFromQueue(track.id)} />)}</div></SortableContext></DndContext><button className="queue-clear" onClick={() => void clearQueue()}><ListX size={15} />Clear queue</button></> : <div className="queue-empty"><span className="grid size-11 place-items-center rounded-xl bg-[#8CB9A5]/10 text-[#8CB9A5]"><Play size={18} /></span><p className="mt-4 font-medium text-[#EDECE6]">Nothing is waiting.</p><p className="mt-1 text-sm leading-6 text-[#949E98]">Add recordings from the collection to build a sequence that stays with this browser.</p></div>}</motion.aside></div>}</AnimatePresence>;
}

function QueueRow({ track, active, playing, onPlay, onRemove }: { track: MusicTrack; active: boolean; playing: boolean; onPlay: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`queue-row ${active ? "is-current" : ""} ${isDragging ? "is-dragging" : ""}`}><button className="queue-handle" {...attributes} {...listeners} aria-label={`Reorder ${track.title}`}><GripVertical size={16} /></button><button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onPlay}>{active ? <span className="grid size-10 place-items-center rounded-lg bg-[#8CB9A5]/10"><SignalBars active={playing} /></span> : <CoverArt track={track} className="size-10 rounded-lg" />}<span className="min-w-0"><span className="block truncate text-sm font-medium text-[#EDECE6]">{track.title}</span><span className="mt-0.5 block truncate text-xs text-[#8C9690]">{track.artist} · {formatDuration(track.duration)}</span></span></button><button className="queue-remove" onClick={onRemove} aria-label={`Remove ${track.title} from queue`}><Trash2 size={15} /></button></div>;
}
