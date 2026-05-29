# Devin Infrastructure Monitoring

Lightweight Devin admin tooling built with Bun, React, Tailwind, shadcn, and the local
`devin-platform-typescript` client.

Implemented pages include enterprise hypervisors, Git connections, and audit logs. The frontend calls the local Bun
backend, which uses `DEVIN_PLATFORM_API_KEY` from `.env` and defaults to `https://api.devin.ai` before
calling the public Platform API methods, including `client.enterprise.listHypervisors()` and
`client.enterprise.gitProviders.listConnections()`, plus `client.enterprise.listAuditLogs()`.

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun run dev
```

To run for production:

```bash
bun run start
```

To build:

```bash
bun run build
```
