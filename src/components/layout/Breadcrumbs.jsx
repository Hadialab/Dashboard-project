import { Link, useLocation } from "react-router-dom";

const routeNames = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  settings: "Settings",
  profile: "Profile",
};

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav className="mb-6 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            to="/dashboard"
            className="text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const path = `/${segments.slice(0, index + 1).join("/")}`;
          const name = routeNames[segment] || segment;

          return (
            <li key={path} className="flex items-center gap-2">
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <Link
                to={path}
                className="text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
