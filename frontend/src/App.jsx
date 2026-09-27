import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import Deals from "./pages/Deals";
import ProtectedRoute from "./routes/ProtectedRoute";
import useThemeStore from "./store/themeStore";



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
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;