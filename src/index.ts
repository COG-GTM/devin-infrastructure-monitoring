import { serve } from "bun";
import DevinPlatform from "../devin-platform-typescript/src";
import type { EnterpriseListAuditLogsParams } from "../devin-platform-typescript/src/resources/enterprise/enterprise";
import index from "./index.html";

const DEFAULT_DEVIN_API_BASE_URL = "https://api.devin.ai";

function getOptionalNumber(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function listAuditLogs(req: Request) {
  if (!process.env.DEVIN_PLATFORM_API_KEY) {
    return Response.json({ error: "DEVIN_PLATFORM_API_KEY is not configured." }, { status: 500 });
  }

  const url = new URL(req.url);
  const query: EnterpriseListAuditLogsParams = {
    action: (url.searchParams.get("action") || undefined) as EnterpriseListAuditLogsParams["action"],
    after: url.searchParams.get("after") || undefined,
    first: getOptionalNumber(url.searchParams, "first"),
    order: (url.searchParams.get("order") || undefined) as EnterpriseListAuditLogsParams["order"],
    time_after: getOptionalNumber(url.searchParams, "time_after"),
    time_before: getOptionalNumber(url.searchParams, "time_before"),
  };

  try {
    const client = new DevinPlatform({
      apiKey: process.env.DEVIN_PLATFORM_API_KEY,
      baseURL: process.env.DEVIN_PLATFORM_BASE_URL || DEFAULT_DEVIN_API_BASE_URL,
    });
    return Response.json(await client.enterprise.listAuditLogs(query));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/admin/audit-logs": {
      GET: listAuditLogs,
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
