import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Breadcrumbs from "./Breadcrumbs";
import { Outlet } from "react-router-dom";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col md:pl-72">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs />
          <div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;