import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  EnterpriseGetQueueStatusResponse,
  EnterpriseListHypervisorsResponse,
} from "../../devin-platform-typescript/src/resources/enterprise/enterprise";

const PAGE_SIZE = 100;
const statuses = ["all", "available", "restarting", "disconnected", "terminated", "draining"] as const;

type Hypervisor = EnterpriseListHypervisorsResponse.Item;
type Status = (typeof statuses)[number];
type SortKey = "created_at" | "last_heartbeat";
type SortDirection = "asc" | "desc";

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

function queueStatusClassName(status: EnterpriseGetQueueStatusResponse["status"]) {
  if (status === "normal") return "bg-green-100 text-green-800";
  if (status === "high") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

async function fetchJson<T>(url: string) {
  const res = await fetch(url);
  const response = await res.json();
  if (!res.ok) {
    throw new Error(response.error || `Failed to fetch ${url}.`);
  }
  return response as T;
}

export function HypervisorsPage() {
  const [status, setStatus] = useState<Status>("all");
  const [sortKey, setSortKey] = useState<SortKey>("last_heartbeat");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hypervisors, setHypervisors] = useState<Hypervisor[]>([]);
  const [queueStatus, setQueueStatus] = useState<EnterpriseGetQueueStatusResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const filteredHypervisors = useMemo(() => {
    const items = status === "all" ? hypervisors : hypervisors.filter((item) => item.status === status);
    return [...items].sort((a, b) => {
      const left = a[sortKey] ?? 0;
      const right = b[sortKey] ?? 0;
      return sortDirection === "asc" ? left - right : right - left;
    });
  }, [hypervisors, sortDirection, sortKey, status]);

  const stats = useMemo(() => {
    const available = hypervisors.filter((item) => item.status === "available").length;
    const disconnected = hypervisors.filter((item) => item.status === "disconnected").length;
    const utilizationHypervisors = hypervisors.filter((item) => item.status === "available" || item.status === "draining");
    const averageUtilization = utilizationHypervisors.length
      ? utilizationHypervisors.reduce((total, item) => total + item.utilization_percentage, 0) / utilizationHypervisors.length
      : 0;
    return { available, averageUtilization, disconnected, total: hypervisors.length };
  }, [hypervisors]);

  async function loadHypervisors() {
    setIsLoading(true);
    setError(undefined);

    try {
      const queuePromise = fetchJson<EnterpriseGetQueueStatusResponse>("/api/admin/queue");
      const items: Hypervisor[] = [];
      let after: string | undefined;
      do {
        const searchParams = new URLSearchParams({ first: String(PAGE_SIZE), status: "all" });
        if (after) searchParams.set("after", after);
        const page = await fetchJson<EnterpriseListHypervisorsResponse>(`/api/admin/hypervisors?${searchParams.toString()}`);
        items.push(...page.items);
        after = page.has_next_page && page.end_cursor ? page.end_cursor : undefined;
      } while (after);

      const nextQueueStatus = await queuePromise;
      setHypervisors(items);
      setQueueStatus(nextQueueStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHypervisors();
  }, []);

  function toggleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("desc");
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
            Monitor all enterprise hypervisors and queue health with client-side filtering and sorting.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters and sorting</CardTitle>
            <CardDescription>All hypervisors load when the page opens. Status filters and sorting apply locally.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
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
                <div className="grid gap-2 md:w-56">
                  <Label>Sort column</Label>
                  <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created</SelectItem>
                      <SelectItem value="last_heartbeat">Last heartbeat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 md:w-44">
                  <Label>Sort direction</Label>
                  <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest first</SelectItem>
                      <SelectItem value="asc">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={() => void loadHypervisors()} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Refresh all
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>}

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Queue size" value={queueStatus ? String(queueStatus.queue_size) : "-"} />
          <StatusStatCard label="Queue status" value={queueStatus?.status} />
          <StatCard label="Total loaded" value={String(stats.total)} />
          <StatCard label="Available" value={String(stats.available)} />
          <StatCard label="Disconnected" value={String(stats.disconnected)} />
          <StatCard label="Avg available/draining utilization" value={formatUtilization(stats.averageUtilization)} />
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Fleet</CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading every hypervisor page..."
                : `${filteredHypervisors.length} of ${hypervisors.length} hypervisors shown`}
            </CardDescription>
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
                    <SortableHeader activeKey={sortKey} direction={sortDirection} label="Created" sortKey="created_at" onSort={toggleSort} />
                    <SortableHeader
                      activeKey={sortKey}
                      direction={sortDirection}
                      label="Last heartbeat"
                      sortKey="last_heartbeat"
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Loading all hypervisors...
                      </td>
                    </tr>
                  ) : filteredHypervisors.length ? (
                    filteredHypervisors.map((hypervisor) => <HypervisorRow key={hypervisor.hypervisor_id} hypervisor={hypervisor} />)
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

function StatusStatCard({ label, value }: { label: string; value: EnterpriseGetQueueStatusResponse["status"] | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">
          {value ? <span className={`rounded-full px-2 py-1 text-sm font-medium ${queueStatusClassName(value)}`}>{value}</span> : "-"}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function SortableHeader({
  activeKey,
  direction,
  label,
  sortKey,
  onSort,
}: {
  activeKey: SortKey;
  direction: SortDirection;
  label: string;
  sortKey: SortKey;
  onSort: (sortKey: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th className="px-4 py-3 font-medium">
      <button type="button" className="flex items-center gap-1 uppercase" onClick={() => onSort(sortKey)}>
        {label}
        {isActive ? direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
      </button>
    </th>
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
