import { useEffect, type RefObject } from "react";

/**
 * Closes a popover on any click outside `ref`'s element, via a document-level
 * listener rather than a full-screen backdrop div — a backdrop's z-index is
 * only ever compared within its own ancestor's stacking context, so nesting
 * it inside an element that has its own stacking context (e.g. a dnd-kit
 * column using `transform`) can leave clicks elsewhere on the page unable
 * to reach it, even though it visually covers the viewport.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutside, enabled]);
}
