
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/dashboard/Dashboard";
import Leads from "./pages/leads/Leads";
import "./App.css";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <div className="min-h-screen md:ml-64">
        <Topbar />

        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
