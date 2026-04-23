import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const stepSkeletons = [2, 2, 1]; // Column spans for steps

  return (
    <div className="space-y-6" aria-label="Loading hotel booking">
      {/* Step Indicators Skeleton */}
      <div className="grid grid-cols-5 gap-6">
        {stepSkeletons.map((colSpan, index) => (
          <div
            key={`step-skeleton-${index}`}
            className={`col-span-${colSpan} flex gap-3 items-center`}
          >
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-5 grow" />
          </div>
        ))}
      </div>

      {/* Content Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`content-skeleton-${index}`}
            className="w-full h-32 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
