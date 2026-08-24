import { useEffect, useRef, type RefObject } from "react";

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function useDialogFocus(active: boolean, containerRef: RefObject<HTMLElement | null>, onRequestClose: () => void) {
  const closeRef = useRef(onRequestClose); useEffect(() => { closeRef.current = onRequestClose; }, [onRequestClose]);
  useEffect(() => {
    if (!active) return; const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null; const timer = window.setTimeout(() => { const items = containerRef.current?.querySelectorAll<HTMLElement>(focusable); (items?.[0] ?? containerRef.current)?.focus(); }, 0);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; } if (event.key !== "Tab") return; const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []); if (!items.length) { event.preventDefault(); return; } const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } };
    window.addEventListener("keydown", onKeyDown); return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [active, containerRef]);
}
