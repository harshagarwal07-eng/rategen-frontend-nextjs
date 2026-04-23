import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex-1 px-4 py-4 flex flex-col overflow-hidden gap-3">
      {/* Toolbar: search + buttons */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24 ml-auto" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Table header */}
      <div className="flex gap-3 px-3 py-2 border rounded-md">
        {[120, 180, 140, 160, 120, 100, 80].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>

      {/* Table rows */}
      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex gap-3 px-3 py-3 border rounded-md">
            {[120, 180, 140, 160, 120, 100, 80].map((w, j) => (
              <Skeleton key={j} className="h-4" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
