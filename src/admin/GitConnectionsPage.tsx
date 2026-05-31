import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GitProviderListConnectionsResponse } from "../../devin-platform-typescript/src/resources/enterprise/git-providers";

const PAGE_SIZE = 100;

type GitConnection = GitProviderListConnectionsResponse.Item;

function formatTime(value: number) {
  return new Date(value * 1000).toLocaleString();
}

function isPatConnection(connection: GitConnection) {
  return connection.git_provider_type.endsWith("_token");
}

function providerLabel(value: GitConnection["git_provider_type"]) {
  return value.replaceAll("_", " ");
}

export function GitConnectionsPage() {
  const [connections, setConnections] = useState<GitConnection[]>([]);
  const [apiTotal, setApiTotal] = useState<number | null | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const patConnections = useMemo(() => connections.filter(isPatConnection), [connections]);

  async function loadConnections() {
    setIsLoading(true);
    setError(undefined);

    try {
      const items: GitConnection[] = [];
      let total: number | null | undefined;
      let after: string | undefined;
      do {
        const searchParams = new URLSearchParams({ first: String(PAGE_SIZE) });
        if (after) searchParams.set("after", after);
        const res = await fetch(`/api/admin/git-connections?${searchParams.toString()}`);
        const response = await res.json();
        if (!res.ok) {
          throw new Error(response.error || "Failed to load Git connections.");
        }
        const page = response as GitProviderListConnectionsResponse;
        items.push(...page.items);
        total = page.total;
        after = page.has_next_page && page.end_cursor ? page.end_cursor : undefined;
      } while (after);

      setConnections(items);
      setApiTotal(total);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConnections();
  }, []);

  function refresh() {
    void loadConnections();
  }

  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Enterprise Git providers</p>
            <h2 className="text-3xl font-semibold tracking-tight">Git connections</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Lists Git connections and flags PAT-backed token connections as warnings. Token secret values are not displayed.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Loaded connections</CardDescription>
              <CardTitle className="text-2xl">{hasLoaded ? connections.length : "-"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-900">PAT warnings</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl text-yellow-900">
                <AlertTriangle className="size-5" />
                {hasLoaded ? patConnections.length : "-"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total if available</CardDescription>
              <CardTitle className="text-2xl">{apiTotal ?? "-"}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>PAT tokens present</CardTitle>
              <CardDescription>Any Git provider type ending in _token is treated as a PAT-backed warning.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={refresh} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                Refresh all
              </Button>
            </div>
          </CardHeader>
        </Card>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{error}</div>}

        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Connections</CardTitle>
              <CardDescription>
                {hasLoaded
                  ? `${connections.length}${apiTotal ? ` of ${apiTotal}` : ""} connections loaded from all pages`
                  : "No connections loaded yet"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Warning</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Provider type</th>
                    <th className="px-4 py-3 font-medium">Host</th>
                    <th className="px-4 py-3 font-medium">Connection ID</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        Loading all Git connections...
                      </td>
                    </tr>
                  ) : connections.length ? (
                    connections.map((connection) => <ConnectionRow key={connection.git_connection_id} connection={connection} />)
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No Git connections found.
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

function ConnectionRow({ connection }: { connection: GitConnection }) {
  const isPat = isPatConnection(connection);
  return (
    <tr className="border-b align-top">
      <td className="px-4 py-3">
        {isPat ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-900">
            <AlertTriangle className="size-3" />
            PAT warning
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">OAuth/App</span>
        )}
      </td>
      <td className="max-w-[220px] truncate px-4 py-3">{connection.name || "-"}</td>
      <td className="px-4 py-3 font-mono text-xs">{providerLabel(connection.git_provider_type)}</td>
      <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{connection.host}</td>
      <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
        {connection.git_connection_id}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{formatTime(connection.created_at)}</td>
    </tr>
  );
}
