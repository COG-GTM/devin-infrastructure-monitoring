# Devin Infrastructure Monitoring

## Set up from scratch

1. Install Bun if it is not already installed.

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env` file from `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. In your Devin enterprise settings, create or request a Devin Platform API service user key with the role:

   ```text
   MB Service User - Observability
   ```

5. Paste that key into `.env`:

   ```bash
   DEVIN_PLATFORM_API_KEY=your_service_user_key_here
   ```

6. Start the local app:

   ```bash
   bun run dev
   ```

7. Open the URL printed by Bun in your browser.

## Other commands

Build the app:

```bash
bun run build
```

Run in production mode:

```bash
bun run start
```
