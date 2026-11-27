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
import Employees from "./pages/users/Users";
import EmployeeDetails from "./pages/users/EmployeeDetails";
import Attendance from "./pages/attendance/Attendance";
import Leaves from "./pages/leaves/Leaves";
import RolesAndPermissions from "./pages/permissions/RolesAndPermissions";
import Notifications from "./pages/notifications/Notifications";
import AuditLogs from "./pages/audit-logs/AuditLogs";
import Documents from "./pages/documents/Documents";
import Proposals from "./pages/proposals/Proposals";
import Settings from "./pages/settings/Settings";
import Expenses from "./pages/expenses/Expenses";
import InvoicesList from "./pages/invoices/InvoicesList";
import InvoiceForm from "./pages/invoices/InvoiceForm";
import InvoiceView from "./pages/invoices/InvoiceView";
import InvoiceSettings from "./pages/invoices/InvoiceSettings";
import FacebookOAuthCallback from "./pages/settings/FacebookOAuthCallback";
import Login from "./pages/login/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import "./App.css";

/** The signed-in workspace: sidebar + topbar wrapped around the routed page. */
function AppShell() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] print:bg-white">
      <Sidebar />

      <div className="min-h-screen md:ml-64 print:ml-0 flex flex-col">
        <Topbar />

        <main className="flex-1 p-4 md:p-6 lg:p-7 print:p-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<ProtectedRoute permission="leads.view"><Leads /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute permission="contacts.view"><Contacts /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute permission={["deals.view", "contacts.view", "leads.view"]}><Customers /></ProtectedRoute>} />
            <Route path="/proposals" element={<ProtectedRoute permission="proposals.view"><Proposals /></ProtectedRoute>} />
            <Route path="/customer-proposals" element={<ProtectedRoute permission="proposals.view"><Proposals /></ProtectedRoute>} />
            <Route path="/deals" element={<ProtectedRoute permission="deals.view"><Deals /></ProtectedRoute>} />
            <Route path="/products-services" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/product-services" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/product-service" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/productservices" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/product" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute permission="products_services.view"><ProductsServices /></ProtectedRoute>} />
            <Route path="/follow-ups" element={<ProtectedRoute permission={["leads.view", "tasks.view"]}><FollowUps /></ProtectedRoute>} />
            <Route path="/daily-calls" element={<ProtectedRoute permission={["tasks.view", "leads.view"]}><DailyCalls /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute permission="tasks.view"><Tasks /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute permission="meetings.view"><Meetings /></ProtectedRoute>} />
            <Route path="/targets" element={<ProtectedRoute permission="targets.view"><Targets /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute permission="reports.view"><Reports /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute permission={["tasks.view", "meetings.view"]}><Calendar /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/audit-logs" element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute permission="documents.view"><Documents /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute permission="users.view"><Employees /></ProtectedRoute>} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
            <Route path="/employee-management" element={<ProtectedRoute permission="users.view"><Employees /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute permission="users.view"><Employees /></ProtectedRoute>} />
            <Route path="/users/:id" element={<EmployeeDetails />} />
            <Route path="/user-management" element={<ProtectedRoute permission="users.view"><Employees /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute permission="attendance.view"><Attendance /></ProtectedRoute>} />
            <Route path="/employee-attendance" element={<ProtectedRoute permission="attendance.view"><Attendance /></ProtectedRoute>} />
            <Route path="/attendance-management" element={<ProtectedRoute permission="attendance.view"><Attendance /></ProtectedRoute>} />
            <Route path="/leaves" element={<ProtectedRoute permission="leave.view"><Leaves /></ProtectedRoute>} />
            <Route path="/leave-management" element={<ProtectedRoute permission="leave.view"><Leaves /></ProtectedRoute>} />
            <Route path="/my-leaves" element={<ProtectedRoute permission="leave.view"><Leaves /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute permission={["roles.view", "permissions.view"]}><RolesAndPermissions /></ProtectedRoute>} />
            <Route path="/roles-permissions" element={<ProtectedRoute permission={["roles.view", "permissions.view"]}><RolesAndPermissions /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute permission="expenses.view"><Expenses /></ProtectedRoute>} />
            <Route path="/expense" element={<ProtectedRoute permission="expenses.view"><Expenses /></ProtectedRoute>} />
            <Route path="/expense-management" element={<ProtectedRoute permission="expenses.view"><Expenses /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute permission="invoices.view"><InvoicesList /></ProtectedRoute>} />
            <Route path="/invoice" element={<ProtectedRoute permission="invoices.view"><InvoicesList /></ProtectedRoute>} />
            <Route path="/invoices/new" element={<ProtectedRoute permission={["invoices.create", "invoices.edit"]}><InvoiceForm /></ProtectedRoute>} />
            <Route path="/invoices/settings" element={<ProtectedRoute adminOnly permission="invoices.settings"><InvoiceSettings /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute permission="invoices.view"><InvoiceView /></ProtectedRoute>} />
            <Route path="/invoices/:id/edit" element={<ProtectedRoute permission="invoices.edit"><InvoiceForm /></ProtectedRoute>} />
            <Route path="/settings/facebook/callback" element={<ProtectedRoute adminOnly><FacebookOAuthCallback /></ProtectedRoute>} />
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
