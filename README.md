# HMS ACP Incident Resolver — Claude Code Plugin

A Claude Code plugin that triages and resolves HumanSoft ACP incident cards end-to-end.
It bundles:

- **Skill** `acp-incident-resolver` — the workflow for listing → picking → diagnosing →
  (optionally) fixing incidents across `web-ccs` (CCS frontend), `web-hrs` (HRS frontend),
  and `api-server` (shared backend). Talks to the user in Thai.
- **MCP server** `hms-acp-incident-mcp` — the data source that feeds incidents to the skill
  ([PonlapatSVBL/hms-acp-incident-mcp](https://github.com/PonlapatSVBL/hms-acp-incident-mcp)).

## Layout

```
hms-acp-incident-resolver-plugin/
├── .claude-plugin/
│   └── plugin.json                      # plugin manifest
├── .mcp.json                            # MCP server config (hms-acp-incident-mcp via npx)
└── skills/
    └── acp-incident-resolver/
        ├── SKILL.md                     # the skill
        ├── evals.json                   # evals for the skill
        └── references/
            ├── incident-mcp-contract.md
            ├── cross-repo-routing.md
            └── diagnosis-and-fix.md
```

## Prerequisites

1. **Node.js 18+** with `npx` (to run the MCP server).
2. **Local checkouts** of `web-ccs`, `web-hrs`, and `api-server` — the skill asks for the
   path to each on first use (no cloning required).
3. **ACP credentials** (`ACP_USERNAME` and `ACP_PASSWORD`).

## Setup

### 1. Set environment variables

`.mcp.json` references these via `${VAR}` expansion:

| Variable             | Required | Default                              | Purpose              |
| -------------------- | -------- | ------------------------------------ | -------------------- |
| `ACP_USERNAME`       | **Yes**  | —                                    | ACP login username   |
| `ACP_PASSWORD`       | **Yes**  | —                                    | ACP login password   |
| `ACP_API_BASE_URL`   | No       | `https://core-acp.humansoft.co.th`   | API base URL         |
| `ACP_API_PATH`       | No       | `/api.php`                           | API path             |
| `ACP_API_TIMEOUT_MS` | No       | `30000`                              | Request timeout (ms) |

Pick whichever method fits your workflow:

**Option A — `.env` file (recommended)** — create a `.env` file in your home directory
(`~/.env` or `C:\Users\<you>\.env`). Claude Code loads it automatically:

```
ACP_USERNAME=your-username
ACP_PASSWORD=your-password
```

**Option B — PowerShell profile** (persistent across sessions) — add to `$PROFILE`:

```powershell
$env:ACP_USERNAME = "your-username"
$env:ACP_PASSWORD = "your-password"
```

Run `notepad $PROFILE` to open the file (create it if it doesn't exist).

**Option C — Windows system environment variables** (persistent, any shell):

```powershell
setx ACP_USERNAME "your-username"
setx ACP_PASSWORD "your-password"
```

Restart Claude Code after running `setx`.

**Option D — Session only** (lost when the terminal closes):

```powershell
# PowerShell
$env:ACP_USERNAME = "your-username"
$env:ACP_PASSWORD = "your-password"
```

```bash
# bash/zsh
export ACP_USERNAME="your-username"
export ACP_PASSWORD="your-password"
```

> The MCP server runs via `npx @rabbitdev/hms-acp-incident-mcp` — no manual clone or build needed.

### 2. Install the plugin

This repo doubles as its own plugin marketplace (`.claude-plugin/marketplace.json`).
In Claude Code:

```
/plugin marketplace add PonlapatSVBL/hms-acp-incident-resolver-plugin
/plugin install hms-acp-incident-resolver@hms-acp
```

Or for local development, point the marketplace at your clone:

```
/plugin marketplace add /path/to/hms-acp-incident-resolver-plugin
```

Then verify:

```
/plugin           # confirm the plugin is enabled
/mcp              # confirm hms-acp-incident-mcp is connected
```

## Usage

Just talk to the skill in Thai. It triggers on requests like:

- `มี incident อะไรต้องทำบ้าง` / `ดู incident เดือนนี้ที่ยังไม่เสร็จ`
- `incident INC-1234 แก้ที่ไหน`
- `ช่วยแก้ incident นี้ให้หน่อย`

The workflow has two mandatory stop-and-wait checkpoints — after listing incidents (it asks
which one) and after diagnosing (it asks whether to fix). Two hard safety rules are always
enforced: **it never pushes / opens PRs / commits-and-pushes**, and **it never writes to the
incident card** (it drafts update text for you to paste yourself).

## Notes

- If `hms-acp-incident-mcp` is **not** connected, the skill stops and guides the user through
  setup — it will not fabricate incidents.
- `skills/acp-incident-resolver/evals.json` contains evals for the skill. Eval #4 deliberately
  runs with the MCP disconnected to verify the precondition path.
