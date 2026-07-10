import { FileSearch } from "lucide-react";

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-full bg-blue-100 p-5 dark:bg-blue-900/30">
        <FileSearch
          size={42}
          className="text-blue-600"
        />
      </div>

    <h2 className="mt-6 text-2xl font-bold">
  No matching reports
</h2>

<p className="mt-2 max-w-sm text-center text-gray-500">
  No reports match the current search or filters.
  Try changing your criteria or resetting the filters.
</p>
    </div>
  );
};

export default EmptyState;