import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
      </div>

      {/* Content Area: Messages + Right Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 px-4 py-10 space-y-4 overflow-hidden">
            <div className="flex gap-3 justify-start">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-16 rounded-lg w-2/5" />
            </div>
            <div className="flex gap-3 justify-end">
              <Skeleton className="h-16 rounded-lg w-2/5" />
              <Skeleton className="size-8 rounded-full shrink-0" />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4">
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>

        {/* Right Sidebar: Details Panel + Icon Rail */}
        <div className="flex shrink-0 h-[calc(100%-8px)] border-l w-[514px]">
          {/* Details Panel */}
          <div className="flex-1 overflow-hidden bg-background rounded-l-xl border-r h-full p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>

          {/* Icon Rail */}
          <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-muted/10">
            <Skeleton className="size-10 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
