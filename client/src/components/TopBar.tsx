import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared style for the icon/text buttons that sit on the dark top bar. */
export const topBarButtonClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-topbar-foreground/90 transition-colors hover:bg-white/15 focus-visible:bg-white/15 outline-none";

export function TopBar({
  onHome,
  center,
  children,
}: {
  onHome?: () => void;
  center?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 bg-topbar px-2 text-topbar-foreground shadow-sm sm:px-3">
      <button
        type="button"
        onClick={onHome}
        className={cn(topBarButtonClass, "shrink-0 px-1.5")}
        aria-label="Accueil"
      >
        <img src="/logo.png" alt="" className="h-7 w-7 rounded" />
        <span className="hidden text-[15px] font-bold tracking-tight sm:inline">
          KanbanStyle
        </span>
      </button>

      {center && <div className="flex min-w-0 flex-1 items-center">{center}</div>}
      {!center && <div className="flex-1" />}

      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </header>
  );
}
