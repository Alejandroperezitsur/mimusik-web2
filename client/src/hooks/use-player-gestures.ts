import { useRef } from "react";

type PlayerGestureActions = { onNext: () => void; onPrevious: () => void; onOpen?: () => void; onClose?: () => void };
type GestureStart = { x: number; y: number; pointerId: number } | undefined;

const HORIZONTAL_THRESHOLD = 72;
const VERTICAL_THRESHOLD = 56;

export type PlayerGesture = "next" | "previous" | "open" | "close" | undefined;

export function resolvePlayerGesture(deltaX: number, deltaY: number): PlayerGesture {
  if (Math.abs(deltaX) >= HORIZONTAL_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) return deltaX < 0 ? "next" : "previous";
  if (Math.abs(deltaY) >= VERTICAL_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) return deltaY < 0 ? "open" : "close";
  return undefined;
}

export function usePlayerGestures(actions: PlayerGestureActions) {
  const start = useRef<GestureStart>(undefined);
  const suppressClick = useRef(false);
  const nestedControl = (target: EventTarget | null, currentTarget: EventTarget | null) => {
    if (!(target instanceof Element) || !(currentTarget instanceof Element)) return false;
    const control = target.closest("button, input, [role='slider'], a");
    return Boolean(control && control !== currentTarget);
  };

  return {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (nestedControl(event.target, event.currentTarget)) return;
      start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      const current = start.current;
      start.current = undefined;
      if (!current || current.pointerId !== event.pointerId) return;
      const x = event.clientX - current.x;
      const y = event.clientY - current.y;
      const gesture = resolvePlayerGesture(x, y);
      suppressClick.current = Boolean(gesture);
      if (gesture === "next") actions.onNext();
      if (gesture === "previous") actions.onPrevious();
      if (gesture === "open") actions.onOpen?.();
      if (gesture === "close") actions.onClose?.();
    },
    onPointerCancel: () => { start.current = undefined; },
    onClickCapture: (event: React.MouseEvent<HTMLElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
