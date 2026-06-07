# Google Drive / Docs MCP — Setup Runbook

> Goal: let Claude (in Claude Code) create and update **Google Docs** directly in your Drive — e.g. push `docs/instant-market/*.md` straight into a Doc instead of manually importing.
> The repo is already configured (`/.mcp.json`). This runbook covers the parts only **you** can do, because they need your Google account and secrets.

---

## The honest constraints (read first)

1. **OAuth needs you.** Google requires a browser consent the first time. A headless cloud container can't do that — so you mint a **refresh token** once on your own machine, then hand it to Claude as a secret.
2. **Secrets never go in the repo.** `.mcp.json` references `${ENV_VARS}`. You set the actual values in your **Claude Code web environment settings**, not in git.
3. **Loads at session start.** After secrets are set, the MCP only appears in a **new** session (run `/mcp` to check). It won't activate in the session where you configured it.
4. **stdio-on-web caveat.** This server is a local `stdio` process (`npx @piotr-agier/google-drive-mcp`). It works great in Claude Code **desktop/CLI**. If the **web** runtime declines to spawn stdio servers, use the *Alternative* at the bottom (Google's official remote MCP).
5. **Testing-mode token expiry.** Google expires refresh tokens after **7 days** while your OAuth app is in "Testing." Publish the app (Step 1e) to get a long-lived token.

---

## What's already done (in this repo)

`/.mcp.json` registers the server and wires three secrets via env expansion:

```json
{
  "mcpServers": {
    "gdrive": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@piotr-agier/google-drive-mcp"],
      "env": {
        "GOOGLE_DRIVE_MCP_CLIENT_ID": "${GOOGLE_DRIVE_MCP_CLIENT_ID}",
        "GOOGLE_DRIVE_MCP_CLIENT_SECRET": "${GOOGLE_DRIVE_MCP_CLIENT_SECRET}",
        "GOOGLE_DRIVE_MCP_REFRESH_TOKEN": "${GOOGLE_DRIVE_MCP_REFRESH_TOKEN}"
      }
    }
  }
}
```

Server reference: `@piotr-agier/google-drive-mcp` (npm). It exposes Drive + Docs tools including `createGoogleDoc` and `updateGoogleDoc`.

---

## Step 1 — Google Cloud project + OAuth credentials (you, ~10 min)

1. **a.** Go to [console.cloud.google.com](https://console.cloud.google.com) → create/select a project (e.g. `instant-market`).
2. **b.** Enable these APIs (APIs & Services → Library): **Google Drive API**, **Google Docs API**. (Add Sheets/Slides/Calendar only if you want them.)
3. **c.** APIs & Services → **OAuth consent screen** → User type **External** → fill app name + your email. Add yourself under **Test users**.
4. **d.** APIs & Services → **Credentials** → **Create credentials → OAuth client ID** → Application type **Desktop app**. Download it. Note the **Client ID** and **Client secret**.
   - Scopes you'll authorize: `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/documents` (add `.../auth/drive` if you want full Drive access).
5. **e.** *(Recommended)* On the consent screen, click **Publish app** so refresh tokens don't expire every 7 days.

## Step 2 — Mint a refresh token on YOUR machine (you, ~5 min)

The token is created by completing the consent flow once locally. Two easy ways:

- **Option A — Google's OAuth Playground:** go to [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground) → gear icon → check "Use your own OAuth credentials" → paste your Client ID/Secret → select the Drive + Docs scopes → Authorize → "Exchange authorization code for tokens" → copy the **Refresh token**.
- **Option B — run the server locally once:** on your laptop, `npx @piotr-agier/google-drive-mcp` with the Client ID/Secret set; it opens a browser, you consent, and it prints/saves a refresh token. (Confirm exact flow in the package README.)

You now have three values: **Client ID**, **Client secret**, **Refresh token**.

## Step 3 — Put the secrets in your web environment (you)

In Claude Code on the web, open your **environment settings** (where environment variables / setup scripts are configured for this repo's sessions) and add:

| Variable | Value |
|---|---|
| `GOOGLE_DRIVE_MCP_CLIENT_ID` | your OAuth client ID |
| `GOOGLE_DRIVE_MCP_CLIENT_SECRET` | your OAuth client secret |
| `GOOGLE_DRIVE_MCP_REFRESH_TOKEN` | the refresh token from Step 2 |

> Docs on how the web environment handles env vars & setup: https://code.claude.com/docs/en/claude-code-on-the-web

*(For Claude Code desktop/CLI instead: set these as real shell env vars, or run `claude mcp add` — see https://code.claude.com/docs/en/mcp )*

## Step 4 — Start a new session & verify

1. Start a **new** Claude Code session on this repo.
2. Run `/mcp` — you should see `gdrive` connected.
3. Ask: *"Use the gdrive MCP to create a Google Doc titled 'Instant Market — Product Strategy' from `docs/instant-market/PRODUCT_STRATEGY.md`."*

Once it's connected, I can keep the repo `.md` and the Google Doc mirrored on request.

---

## Alternative — Google's official *remote* MCP (if stdio doesn't run on web)

Google ships official **remote (HTTP)** Workspace MCP servers (Drive, Docs, etc.), which suit headless web sessions better (no local process). Setup differs:

- Get the exact remote server **URL** and OAuth instructions from Google's docs:
  - https://developers.google.com/workspace/guides/configure-mcp-servers
  - https://developers.google.com/workspace/drive/api/guides/configure-mcp-server
- Then the `.mcp.json` entry looks like:

```json
{
  "mcpServers": {
    "gdrive": {
      "type": "http",
      "url": "<PASTE-OFFICIAL-URL-FROM-GOOGLE-DOCS>"
    }
  }
}
```

- Authenticate via `/mcp` → select `gdrive` → **Authenticate** (opens Google OAuth).

Swap `.mcp.json` to this form if the stdio server won't connect in the web runtime.

---

## Reality check: do you even need the MCP?

For a one-off, the manual import is faster: upload `PRODUCT_STRATEGY.md` (or the generated `.html`) to Drive → right-click → **Open with → Google Docs**. The MCP only pays off if you want Claude to create/update Docs **repeatedly and automatically**.
