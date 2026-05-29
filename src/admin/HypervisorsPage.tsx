import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCcw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type {
  EnterpriseListHypervisorsParams,
  EnterpriseListHypervisorsResponse,
} from "../../devin-platform-typescript/src/resources/enterprise/enterprise";

const PAGE_SIZE = 50;
const statuses = ["all", "available", "restarting", "disconnected", "terminated", "draining"] as const;

type Hypervisor = EnterpriseListHypervisorsResponse.Item;
type Status = (typeof statuses)[number];

function formatTime(value: number | null) {
  return value ? new Date(value * 1000).toLocaleString() : "-";
}

function formatUtilization(value: number) {
  return `${Math.round(value)}%`;
}

function statusClassName(status: string) {
  if (status === "available") return "bg-green-100 text-green-800";
  if (status === "disconnected" || status === "terminated") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export function HypervisorsPage() {
  const [status, setStatus] = useState<Status>("all");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [hypervisors, setHypervisors] = useState<EnterpriseListHypervisorsResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const filters = useMemo<EnterpriseListHypervisorsParams>(
    () => ({
      after: currentCursor,
      first: PAGE_SIZE,
      status,
    }),
    [currentCursor, status],
  );

  const stats = useMemo(() => {
    const items = hypervisors?.items ?? [];
    const available = items.filter((item) => item.status === "available").length;
    const disconnected = items.filter((item) => item.status === "disconnected").length;
    const averageUtilization = items.length
      ? items.reduce((total, item) => total + item.utilization_percentage, 0) / items.length
      : 0;
    return { available, averageUtilization, disconnected, total: items.length };
  }, [hypervisors]);

  async function loadHypervisors(nextFilters = filters) {
    setIsLoading(true);
    setError(undefined);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      const res = await fetch(`/api/admin/hypervisors?${searchParams.toString()}`);
      const response = await res.json();
      if (!res.ok) {
        throw new Error(response.error || "Failed to load hypervisors.");
      }
      setHypervisors(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursorStack([]);
    setCurrentCursor(undefined);
    void loadHypervisors({ ...filters, after: undefined });
  }

  function goNext() {
    if (!hypervisors?.end_cursor) return;
    const nextCursor = hypervisors.end_cursor;
    setCursorStack((cursors) => [...cursors, currentCursor ?? ""]);
    setCurrentCursor(nextCursor);
    void loadHypervisors({ ...filters, after: nextCursor });
  }

  function goPrevious() {
    const previousCursor = cursorStack.at(-1);
    setCursorStack((cursors) => cursors.slice(0, -1));
    const normalizedCursor = previousCursor || undefined;
    setCurrentCursor(normalizedCursor);
    void loadHypervisors({ ...filters, after: normalizedCursor });
  }

  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Enterprise VPC</p>
            <h2 className="text-3xl font-semibold tracking-tight">Hypervisors</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Monitor enterprise hypervisors with the public Devin Platform API.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Load fleet state by status. Pagination uses the Platform API cursor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
              <div className="grid gap-2 md:w-64">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? "All statuses" : item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Load hypervisors
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Loaded" value={String(stats.total)} />
          <StatCard label="Available" value={String(stats.available)} />
          <StatCard label="Disconnected" value={String(stats.disconnected)} />
          <StatCard label="Avg utilization" value={formatUtilization(stats.averageUtilization)} />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Fleet</CardTitle>
              <CardDescription>
                {hypervisors
                  ? `${hypervisors.items.length}${hypervisors.total ? ` of ${hypervisors.total}` : ""} hypervisors loaded`
                  : "No hypervisors loaded yet"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goPrevious} disabled={isLoading || cursorStack.length === 0}>
                Previous
              </Button>
              <Button type="button" variant="outline" onClick={goNext} disabled={isLoading || !hypervisors?.has_next_page}>
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hypervisor ID</th>
                    <th className="px-4 py-3 font-medium">Instance ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Utilization</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Last heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Loading hypervisors...
                      </td>
                    </tr>
                  ) : hypervisors?.items.length ? (
                    hypervisors.items.map((hypervisor) => <HypervisorRow key={hypervisor.hypervisor_id} hypervisor={hypervisor} />)
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No hypervisors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function HypervisorRow({ hypervisor }: { hypervisor: Hypervisor }) {
  return (
    <tr className="border-b align-top">
      <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs">{hypervisor.hypervisor_id}</td>
      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
        {hypervisor.cloud_provider_instance_id || "-"}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClassName(hypervisor.status)}`}>
          {hypervisor.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, hypervisor.utilization_percentage))}%` }} />
          </div>
          <span className="font-mono text-xs">{formatUtilization(hypervisor.utilization_percentage)}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{formatTime(hypervisor.created_at)}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
        {formatTime(hypervisor.last_heartbeat)}
      </td>
    </tr>
  );
}
