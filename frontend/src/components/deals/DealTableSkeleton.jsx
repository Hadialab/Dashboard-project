import Skeleton, { SkeletonTable } from "../ui/Skeleton";

function DealTableSkeleton() {
  return (
    <>
      <div className="mt-4 hidden md:block">
        <SkeletonTable rows={5} columns={5} />
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>

              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default DealTableSkeleton;
