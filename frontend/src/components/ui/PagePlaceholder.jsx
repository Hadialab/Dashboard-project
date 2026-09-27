import PageHeader from "./PageHeader";
import Card from "./Card";

// Shared shell for pages that exist as routes but have no content yet. Keeps
// them looking like the rest of the app instead of a bare <h1> on a page
// background. Replace the body when the page is actually built.
function PagePlaceholder({ title, description }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <Card className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Nothing here yet
        </h2>

        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          This page has not been built yet.
        </p>
      </Card>
    </div>
  );
}

export default PagePlaceholder;
