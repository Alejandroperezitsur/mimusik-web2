/** Quiet Analog Atelier: import feedback is explicit, cancellable, and resilient per local file. */
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileAudio, FolderOpen, LoaderCircle, Music2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { importAudioFiles } from "@/lib/importer";
import type { ImportProgress } from "@/types/music";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>();
  const [summary, setSummary] = useState<ImportProgress>();
  const setFolderInput = (input: HTMLInputElement | null) => { folderRef.current = input; if (input) input.setAttribute("webkitdirectory", ""); };
  const close = () => { if (progress) return; setSummary(undefined); onClose(); };
  useDialogFocus(open, dialogRef, close);

  const importFiles = async (files: FileList | File[]) => {
    const list = Array.from(files); if (!list.length) return;
    const controller = new AbortController(); abortRef.current = controller;
    setSummary(undefined); setProgress({ total: list.length, completed: 0, imported: 0, skipped: 0, failed: [], cancelled: false });
    try {
      await navigator.storage?.persist?.();
      const result = await importAudioFiles(list, setProgress, controller.signal);
      setSummary(result);
      if (result.cancelled) toast.message("Import stopped. Files already catalogued were kept.");
      else if (result.failed.length) toast.warning(`${result.imported} imported; ${result.failed.length} need attention.`);
      else toast.success(`${result.imported} ${result.imported === 1 ? "track" : "tracks"} added to your library.`, { action: { label: "View library", onClick: () => {} } });
    } catch { toast.error("The import could not be completed. Try smaller batches or another file."); }
    finally { setProgress(undefined); abortRef.current = null; }
  };

  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-[#101313]/70 px-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
    <motion.section ref={dialogRef} tabIndex={-1} className="w-full max-w-xl overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#202524] shadow-[0_24px_90px_rgba(0,0,0,.5)]" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} transition={{ duration: 0.2 }} onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Import local music">
      <header className="flex items-start justify-between border-b border-white/[.07] px-6 py-5"><div><p className="eyebrow">Local library</p><h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-[#F6F3EB]">Bring music into MiMusik</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#A7AFAB]">Audio stays on this device, inside your browser’s offline library.</p></div><button className="icon-button" onClick={close} disabled={Boolean(progress)} aria-label="Close import"><X size={18} /></button></header>
      <div className="p-6">{progress ? <div className="rounded-2xl border border-[#8CB9A5]/25 bg-[#8CB9A5]/[.08] p-7 text-center"><LoaderCircle className="mx-auto animate-spin text-[#8CB9A5]" size={28} /><p className="mt-4 font-medium text-[#F6F3EB]">Cataloguing your collection</p><p className="mt-1 text-sm text-[#A7AFAB]">{progress.completed} of {progress.total} files processed</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#8CB9A5] transition-all" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div><button className="mt-5 text-sm font-semibold text-[#B8D7C8] underline underline-offset-4" onClick={() => abortRef.current?.abort()}>Stop import</button></div> : summary ? <ImportSummary summary={summary} onDone={close} /> : <><div className={`import-dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void importFiles(event.dataTransfer.files); }}><div className="grid size-14 place-items-center rounded-2xl bg-[#8CB9A5]/15 text-[#8CB9A5]"><UploadCloud size={26} /></div><h3 className="mt-5 font-display text-xl text-[#F6F3EB]">Drop audio files here</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#A7AFAB]">MP3, WAV, OGG, FLAC, M4A, and AAC. Metadata and embedded cover art are retained when available.</p><button className="mt-6 rounded-full bg-[#F6F3EB] px-5 py-2.5 text-sm font-semibold text-[#171A19] transition-transform active:scale-[.97]" onClick={() => fileRef.current?.click()}><span className="inline-flex items-center gap-2"><FileAudio size={16} /> Choose files</span></button></div><div className="mt-4 flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-3"><span className="inline-flex items-center gap-2 text-sm text-[#C5CBC7]"><FolderOpen size={16} className="text-[#8CB9A5]" />Import an entire folder</span><button onClick={() => folderRef.current?.click()} className="text-sm font-semibold text-[#8CB9A5] hover:text-[#B7D5C5]">Select folder</button></div><div className="mt-5 flex items-center gap-2 text-xs text-[#7D8782]"><Music2 size={14} />Files are stored locally. Removing browser data will remove your library.</div></>}<input ref={fileRef} type="file" accept="audio/*,.flac,.ogg,.m4a,.aac" multiple className="hidden" onChange={(event) => void importFiles(event.target.files ?? [])} /><input ref={setFolderInput} type="file" multiple className="hidden" onChange={(event) => void importFiles(event.target.files ?? [])} /></div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}

function ImportSummary({ summary, onDone }: { summary: ImportProgress; onDone: () => void }) {
  return <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-6"><p className="eyebrow">Import summary</p><h3 className="mt-2 font-display text-2xl text-[#F6F3EB]">Your shelf has been updated.</h3><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-[#8CB9A5]/10 p-3"><strong className="block text-xl text-[#B9D9C8]">{summary.imported}</strong><span className="mt-1 block text-xs text-[#8F9993]">Imported</span></div><div className="rounded-xl bg-white/[.045] p-3"><strong className="block text-xl text-[#E7E6DF]">{summary.skipped}</strong><span className="mt-1 block text-xs text-[#8F9993]">Skipped</span></div><div className="rounded-xl bg-[#C99077]/10 p-3"><strong className="block text-xl text-[#D9A48D]">{summary.failed.length}</strong><span className="mt-1 block text-xs text-[#8F9993]">Failed</span></div></div>{summary.failed.length > 0 && <div className="mt-5 max-h-28 overflow-auto border-t border-white/[.07] pt-3 text-left">{summary.failed.map((failure) => <p key={`${failure.fileName}-${failure.reason}`} className="py-1 text-xs text-[#C3AAA0]"><span className="font-semibold">{failure.fileName}</span> · {failure.reason}</p>)}</div>}<button className="quiet-action mt-6" onClick={onDone}>Done</button></div>;
}
