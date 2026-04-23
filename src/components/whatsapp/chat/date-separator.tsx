import { memo } from "react";

function fmtDateSep(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export const DateSeparator = memo(function DateSeparator({ ts }: { ts: string }) {
  return (
    <div className="flex items-center justify-center py-3 sticky top-2 z-10 pointer-events-none">
      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-sm px-3 py-1 rounded-full select-none pointer-events-auto">
        {fmtDateSep(ts)}
      </span>
    </div>
  );
});
