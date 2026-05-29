import { AdminLayout, type AdminPage } from "./admin/AdminLayout";
import { AuditLogsPage } from "./admin/AuditLogsPage";
import { HypervisorsPage } from "./admin/HypervisorsPage";
import "./index.css";

function getCurrentPage(): AdminPage {
  if (window.location.pathname.startsWith("/audit-logs")) return "audit-logs";
  return "hypervisors";
}

export function App() {
  const page = getCurrentPage();

  return (
    <AdminLayout activePage={page}>
      {page === "audit-logs" ? <AuditLogsPage /> : <HypervisorsPage />}
    </AdminLayout>
  );
}

export default App;
