import { Skeleton } from "@/components/ui/skeleton";

export default function loading() {
  return (
    <div className=" w-full h-[calc(100vh-11rem)] bg-card rounded-lg p-10 space-y-8">
      <Skeleton className="h-5 w-xl" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
