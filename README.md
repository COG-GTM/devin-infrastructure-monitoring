# Devin Infrastructure Monitoring

Lightweight Devin admin tooling built with Bun, React, Tailwind, shadcn, and the local
`devin-platform-typescript` client.

The first implemented page is an enterprise-wide audit logs viewer. The frontend calls the local Bun
backend, which uses `DEVIN_PLATFORM_API_KEY` from `.env` and defaults to `https://api.devin.ai` before
calling `client.enterprise.listAuditLogs()`.

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
