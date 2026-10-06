import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons, never spinners, while the page loads (design system). Only on pages that
 * never 404: a loading boundary streams a 200 before notFound() could run.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-card md:col-span-2 lg:row-span-2" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </div>
    </div>
  );
}
