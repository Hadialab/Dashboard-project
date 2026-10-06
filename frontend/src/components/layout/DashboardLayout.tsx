import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CommandPalette from "../ui/CommandPalette";
import ErrorBoundary from "../ErrorBoundary";
import { reportError } from "../../services/errorTracking";
import { useLiveIndicator } from "../../hooks/useLiveUpdates";
import { connectLiveUpdates, watchForSessionEnd } from "../../services/liveSession";
import useAuthStore from "../../store/authStore";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const indicator = useLiveIndicator();

  useEffect(() => {
    if (isLoggedIn) void connectLiveUpdates();
    return watchForSessionEnd();
  }, [isLoggedIn]);

  // Cmd+K on macOS, Ctrl+K elsewhere. Bound once here rather than in the palette
  // so it works from anywhere in the app, including inside a table's search box.
  const onKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPaletteOpen((open) => !open);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-w-0 on this row-flex child and on main below. A flex item defaults
          to min-width:auto, which means it refuses to shrink below its content's
          min-content width. The pipeline board's min-content width is six columns
          side by side, so without this the whole app column — navbar included —
          was stretched to the width of the board and the page scrolled sideways
          instead of the board scrolling inside its own container. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:pl-72">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
          // Rendered inside the navbar so it sits with the other status items,
          // rather than floating over the page as a toast would.
          liveStatus={indicator.status}
        />

        <main className="min-w-0 flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {/* Inside the chrome on purpose. A page that crashes leaves the sidebar
              and navbar working, so the user can navigate somewhere that does
              not — a far better outcome than a blank screen, or a reload that
              lands on the same broken page. */}
          <ErrorBoundary label="this page" onError={reportError}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mounted once, outside the outlet, so it survives navigation and works
          from any page. */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default DashboardLayout;