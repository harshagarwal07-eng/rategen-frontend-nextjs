"use client";

import { usePathname } from "next/navigation";
import Show from "@/components/ui/show";

function getSectionName(pathname: string) {
  const match = pathname.match(/\/docs\/library\/([^\/]+)/);
  if (!match) return null;

  return match[1].split("-").join(" ");
}

export function LibraryBreadcrumb() {
  const pathname = usePathname();
  const sectionName = getSectionName(pathname);

  return (
    <div className="space-y-2 shrink-0 border-b px-4 py-3 bg-muted/30">
      <div className="flex justify-between w-full gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="text-base font-medium text-muted-foreground">Library</p>
          <Show when={!!sectionName}>
            <span className="text-muted-foreground/50">/</span>
            <p className="text-base font-semibold leading-normal truncate capitalize">{sectionName}</p>
          </Show>
        </div>
      </div>
    </div>
  );
}
