import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCcw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type {
  AuditLogAction,
  EnterpriseListAuditLogsParams,
  PaginatedAuditLogResponse,
} from "../../devin-platform-typescript/src/resources/enterprise/enterprise";
import { auditLogActions } from "./auditLogActions";

const PAGE_SIZE = 50;

type AuditLogItem = PaginatedAuditLogResponse.Item;
type Order = NonNullable<EnterpriseListAuditLogsParams["order"]>;

function toUnixSeconds(value: string) {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
}

function formatTime(value: number) {
  return new Date(value * 1000).toLocaleString();
}

function actorFor(log: AuditLogItem) {
  return log.user_email || log.service_user_name || log.user_id || log.service_user_id || "-";
}

export function AuditLogsPage() {
  const [action, setAction] = useState<AuditLogAction | "all">("all");
  const [order, setOrder] = useState<Order>("desc");
  const [timeAfter, setTimeAfter] = useState("");
  const [timeBefore, setTimeBefore] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [logs, setLogs] = useState<PaginatedAuditLogResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const filters = useMemo<EnterpriseListAuditLogsParams>(
    () => ({
      action: action === "all" ? undefined : action,
      after: currentCursor,
      first: PAGE_SIZE,
      order,
      time_after: toUnixSeconds(timeAfter),
      time_before: toUnixSeconds(timeBefore),
    }),
    [action, currentCursor, order, timeAfter, timeBefore],
  );

  async function loadAuditLogs(nextFilters = filters) {
    setIsLoading(true);
    setError(undefined);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      });
      const res = await fetch(`/api/admin/audit-logs?${searchParams.toString()}`);
      const response = await res.json();
      if (!res.ok) {
        throw new Error(response.error || "Failed to load audit logs.");
      }
      setLogs(response);
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
    void loadAuditLogs({ ...filters, after: undefined });
  }

  function goNext() {
    if (!logs?.end_cursor) return;
    const nextCursor = logs.end_cursor;
    setCursorStack((cursors) => [...cursors, currentCursor ?? ""]);
    setCurrentCursor(nextCursor);
    void loadAuditLogs({ ...filters, after: nextCursor });
  }

  function goPrevious() {
    const previousCursor = cursorStack.at(-1);
    setCursorStack((cursors) => cursors.slice(0, -1));
    const normalizedCursor = previousCursor || undefined;
    setCurrentCursor(normalizedCursor);
    void loadAuditLogs({ ...filters, after: normalizedCursor });
  }

  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Lightweight admin</p>
            <h2 className="text-3xl font-semibold tracking-tight">Audit logs</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Enterprise-wide activity from the Devin Platform API, rendered with shadcn components.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection and filters</CardTitle>
            <CardDescription>
              API requests are proxied through the Bun backend using DEVIN_PLATFORM_API_KEY from .env.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 lg:grid-cols-12" onSubmit={handleSubmit}>
              <div className="grid gap-2 lg:col-span-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={(value) => setAction(value as AuditLogAction | "all")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {auditLogActions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 lg:col-span-1">
                <Label>Order</Label>
                <Select value={order} onValueChange={(value) => setOrder(value as Order)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest</SelectItem>
                    <SelectItem value="asc">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="time-after">After</Label>
                <Input
                  id="time-after"
                  type="datetime-local"
                  value={timeAfter}
                  onChange={(event) => setTimeAfter(event.target.value)}
                />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="time-before">Before</Label>
                <Input
                  id="time-before"
                  type="datetime-local"
                  value={timeBefore}
                  onChange={(event) => setTimeBefore(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 lg:col-span-10">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                  Load logs
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>}

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {logs ? `${logs.items.length}${logs.total ? ` of ${logs.total}` : ""} logs loaded` : "No logs loaded yet"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={goPrevious} disabled={isLoading || cursorStack.length === 0}>
                Previous
              </Button>
              <Button type="button" variant="outline" onClick={goNext} disabled={isLoading || !logs?.has_next_page}>
                Next
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Org ID</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : logs?.items.length ? (
                    logs.items.map((log) => (
                      <tr key={log.audit_log_id} className="border-b align-top">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{formatTime(log.created_at)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{actorFor(log)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.org_id || "-"}</td>
                        <td className="px-4 py-3">
                          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No audit logs found.
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
