import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import useThemeStore from "./store/themeStore";

// Everything past the login screen is split per route. The dashboard, reports
// and CRM pages pull in recharts, jspdf and papaparse, so bundling them all
// into the entry chunk shipped ~1.37 MB to every visitor including the login
// page. Login and Register stay eager since they are the entry point.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/Customers"));
const Leads = lazy(() => import("./pages/Leads"));
const Deals = lazy(() => import("./pages/Deals"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Team = lazy(() => import("./pages/Team"));
const FollowUps = lazy(() => import("./pages/FollowUps"));

// Full-height placeholder while a route chunk downloads.
function RouteFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </span>
    </div>
  );
}

function App() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme !== "light");
  }, [theme]);

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === "dark" ? "#0f172a" : "#ffffff",
            color: theme === "dark" ? "#ffffff" : "#0f172a",
            border:
              theme === "dark"
                ? "1px solid #334155"
                : "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "14px 16px",
            fontSize: "14px",
          },
        }}
      />

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Redirect homepage to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/deals" element={<Deals />} />
            {/* Linked from the user menu, which previously 404'd. */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/followups" element={<FollowUps />} />
            {/* Renders an explanatory state for reps; the API 403s regardless. */}
            <Route path="/team" element={<Team />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;