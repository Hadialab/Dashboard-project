import { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Team = lazy(() => import("./pages/Team"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const AuditLog = lazy(() => import("./pages/AuditLog"));

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
    // On the documentElement rather than a wrapper, because the dark variants
    // throughout the app are written as `dark:` on elements that live outside
    // any single component's subtree.
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
          {/* Eager, like Login and Register: reachable from the sign-in page, and
              shipping them in the entry chunk costs less than a second request. */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Carries ?token=... from an emailed link, so it is not lazy either: it
              is the landing page for an email, often the first paint of a visit. */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes. The outer gate only checks the session; the inner
              ones check the permission for the section, because "signed in" and
              "may see this" are different questions. */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/customers"
              element={
                <ProtectedRoute permission="customers">
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/leads"
              element={
                <ProtectedRoute permission="leads">
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute permission="reports">
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deals"
              element={
                <ProtectedRoute permission="deals">
                  <Deals />
                </ProtectedRoute>
              }
            />
            {/* Same data as /deals, presented as a board rather than a list. */}
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute permission="deals">
                  <Pipeline />
                </ProtectedRoute>
              }
            />
            {/* Linked from the user menu, which previously 404'd. */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/followups" element={<FollowUps />} />
            {/* Renders an explanatory state for Sales users; the API 403s. */}
            <Route path="/team" element={<Team />} />
            {/* Same shape as Team: the page checks the role itself and explains
                the refusal, while the API independently enforces admin-only. */}
            <Route path="/audit" element={<AuditLog />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;