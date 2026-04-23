import { Skeleton } from "@/components/ui/skeleton";

export default function MessageSkeleton() {
  return (
    <div className="w-full max-w-[calc(100vw-16px)] md:max-w-5xl md:mx-auto px-2 py-3 md:p-6 space-y-4 md:space-y-6">
      {/* User message skeleton */}
      <div className="flex gap-3 items-start">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex gap-3 items-start">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>

      {/* User message skeleton */}
      <div className="flex gap-3 items-start">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-2/3 rounded-lg" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="flex gap-3 items-start">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
