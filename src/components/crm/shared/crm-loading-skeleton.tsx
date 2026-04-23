import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CrmLoadingSkeletonProps {
  showDetailsPanel?: boolean;
  className?: string;
}

export function CrmLoadingSkeleton({
  showDetailsPanel = true,
  className,
}: CrmLoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden pt-4 gap-4",
        className
      )}
    >
      {/* Left Sidebar Skeleton */}
      <div className="w-sm flex flex-col h-full space-y-4">
        {/* Header with search and buttons */}
        <div className="flex w-full gap-2 h-16 p-3 border rounded-lg shadow">
          <Skeleton className="h-full w-20" />
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="h-full w-12" />
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 w-full">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>

        {/* List items */}
        <div className="flex-1 space-y-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="size-4 rounded-full shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Center - Chat Area Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                i % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              {i % 2 === 0 && <Skeleton className="size-8 rounded-full shrink-0" />}
              <div className="space-y-2 max-w-md">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
              {i % 2 === 1 && <Skeleton className="size-8 rounded-full shrink-0" />}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="space-y-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Details Skeleton */}
      {showDetailsPanel && (
        <div className="w-80 border-l bg-muted/20 p-4 space-y-4 overflow-hidden">
          {/* Close button */}
          <div className="flex justify-end">
            <Skeleton className="size-8 rounded-md" />
          </div>

          {/* Avatar and name */}
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>

          {/* Details sections */}
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
