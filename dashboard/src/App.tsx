import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import RequireAuth from "./components/auth/RequireAuth";
import { NotificationProvider } from "./context/NotificationContext";
import Dashboard from "./pages/dashboard/Dashboard";
import Leads from "./pages/leads/Leads";
import Contacts from "./pages/contacts/Contacts";
import Customers from "./pages/customers/Customers";
import Deals from "./pages/deals/Deals";
import ProductsServices from "./pages/products-services/ProductsServices";
import Tasks from "./pages/tasks/Tasks";
import FollowUps from "./pages/follow-ups/FollowUps";
import DailyCalls from "./pages/daily-calls/DailyCalls";
import Meetings from "./pages/meetings/Meetings";
import Targets from "./pages/targets/Targets";
import Reports from "./pages/reports/Reports";
import Calendar from "./pages/calendar/Calendar";
import Profile from "./pages/profile/Profile";
import Users from "./pages/users/Users";
import RolesAndPermissions from "./pages/permissions/RolesAndPermissions";
import Notifications from "./pages/notifications/Notifications";
import AuditLogs from "./pages/audit-logs/AuditLogs";
import Login from "./pages/login/Login";
import NotFound from "./pages/NotFound";
import "./App.css";

/** The signed-in workspace: sidebar + topbar wrapped around the routed page. */
function AppShell() {
  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Sidebar />

      <div className="min-h-screen md:ml-64 flex flex-col">
        <Topbar />

        <main className="flex-1 p-4 md:p-6 lg:p-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/products-services" element={<ProductsServices />} />
            <Route path="/product-services" element={<ProductsServices />} />
            <Route path="/product-service" element={<ProductsServices />} />
            <Route path="/productservices" element={<ProductsServices />} />
            <Route path="/products" element={<ProductsServices />} />
            <Route path="/product" element={<ProductsServices />} />
            <Route path="/services" element={<ProductsServices />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/daily-calls" element={<DailyCalls />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/targets" element={<Targets />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/users" element={<Users />} />
            <Route path="/user-management" element={<Users />} />
            <Route path="/permissions" element={<RolesAndPermissions />} />
            <Route path="/roles-permissions" element={<RolesAndPermissions />} />
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
      <Route path="/login" element={<Login />} />

      {/* Everything else requires a session. */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <NotificationProvider>
              <AppShell />
            </NotificationProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
