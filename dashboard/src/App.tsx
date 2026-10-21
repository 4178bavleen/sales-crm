import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import RequireAuth from "./components/auth/RequireAuth";
import Dashboard from "./pages/dashboard/Dashboard";
import Leads from "./pages/leads/Leads";
import Contacts from "./pages/contacts/Contacts";
import Companies from "./pages/companies/Companies";
import Customers from "./pages/customers/Customers";
import Deals from "./pages/deals/Deals";
import Tasks from "./pages/tasks/Tasks";
import Profile from "./pages/profile/Profile";
import Settings from "./pages/settings/Settings";
import Login from "./pages/login/Login";
import NotFound from "./pages/NotFound";
import "./App.css";

/** The signed-in workspace: sidebar + topbar wrapped around the routed page. */
function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <div className="min-h-screen md:ml-64">
        <Topbar />

        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Full-bleed, outside the shell: there is no signed-in user yet. */}
      <Route path="/login" element={<Login initialMode="login" />} />
      <Route path="/forgot-password" element={<Login initialMode="forgot" />} />

      {/* Everything else requires a session. */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
