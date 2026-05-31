import { Activity, GitBranch, Server } from "lucide-react";
import type { ReactNode } from "react";

export type AdminPage = "audit-logs" | "git-connections" | "hypervisors";

const navItems: Array<{ page: AdminPage; label: string; description: string; href: string; icon: typeof Activity }> = [
  {
    page: "hypervisors",
    label: "Hypervisors",
    description: "Fleet status and utilization",
    href: "/hypervisors",
    icon: Server,
  },
  {
    page: "audit-logs",
    label: "Audit logs",
    description: "Enterprise activity stream",
    href: "/audit-logs",
    icon: Activity,
  },
  {
    page: "git-connections",
    label: "Git connections",
    description: "PAT token warnings",
    href: "/git-connections",
    icon: GitBranch,
  },
];

export function AdminLayout({ activePage, children }: { activePage: AdminPage; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b bg-card lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-6 px-5 py-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Lightweight observability</p>
            <h1 className="text-2xl font-semibold tracking-tight">Devin Observability</h1>
          </div>
          <nav className="grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.page === activePage;
              return (
                <a
                  key={item.page}
                  href={item.href}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    isActive ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
