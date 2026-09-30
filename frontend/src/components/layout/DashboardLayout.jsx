import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CommandPalette from "../ui/CommandPalette";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd+K on macOS, Ctrl+K elsewhere. Bound once here rather than in the palette
  // so it works from anywhere in the app, including inside a table's search box.
  const onKeyDown = useCallback((event) => {
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
        />

        <main className="min-w-0 flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mounted once, outside the outlet, so it survives navigation and works
          from any page. */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default DashboardLayout;
