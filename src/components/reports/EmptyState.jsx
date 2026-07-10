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
        No Reports Found
      </h2>

      <p className="mt-2 text-center text-gray-500">
        Try changing your filters or search query.
      </p>
    </div>
  );
};

export default EmptyState;