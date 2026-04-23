"use client";

import { usePathname } from "next/navigation";
import Show from "@/components/ui/show";

function getServiceInfo(pathname: string) {
  const match = pathname.match(/\/api-services\/([^\/]+)(?:\/([^\/]+))?/);
  if (!match) return { serviceName: null, subSection: null };

  const serviceName = match[1].split("-").join(" ");
  const subSection = match[2]?.split("-").join(" ") || null;

  return { serviceName, subSection };
}

export function ApiServiceBreadcrumb() {
  const pathname = usePathname();
  const { serviceName, subSection } = getServiceInfo(pathname);

  return (
    <div className="space-y-2 shrink-0 border-b px-4 py-3 bg-muted/30">
      <div className="flex justify-between w-full gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Show when={!!serviceName}>
            <p className="text-base font-semibold leading-normal truncate capitalize text-muted-foreground">
              {serviceName}
            </p>
          </Show>
          <Show when={!!subSection}>
            <span className="text-muted-foreground/50">/</span>
            <p className="text-base font-semibold leading-normal truncate capitalize">{subSection}</p>
          </Show>
        </div>
      </div>
    </div>
  );
}
