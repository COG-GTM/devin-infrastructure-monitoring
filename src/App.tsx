import { AdminLayout, type AdminPage } from "./admin/AdminLayout";
import { AuditLogsPage } from "./admin/AuditLogsPage";
import { GitConnectionsPage } from "./admin/GitConnectionsPage";
import { HypervisorsPage } from "./admin/HypervisorsPage";
import "./index.css";

function getCurrentPage(): AdminPage {
  if (window.location.pathname.startsWith("/audit-logs")) return "audit-logs";
  if (window.location.pathname.startsWith("/git-connections")) return "git-connections";
  return "hypervisors";
}

export function App() {
  const page = getCurrentPage();

  return (
    <AdminLayout activePage={page}>
      {page === "audit-logs" ? <AuditLogsPage /> : page === "git-connections" ? <GitConnectionsPage /> : <HypervisorsPage />}
    </AdminLayout>
  );
}

export default App;
