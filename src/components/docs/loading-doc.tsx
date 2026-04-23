import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingDoc() {
  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      {/* Toolbar skeleton */}
      <div className="flex items-center space-x-2 px-4 py-3 border-b">
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
      </div>
      {/* Editor area skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-6 w-72 mb-4" />
        <Skeleton className="h-full w-full min-h-[400px]" />
      </div>
    </div>
  );
}
