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
├── .mcp.json                            # MCP server config (hms-acp-incident-mcp)
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

1. **Node.js** (to run the MCP server).
2. **Git access** to the private `HumanSoftTH/web-ccs`, `web-hrs`, and `api-server` repos
   (the skill clones these during diagnosis).
3. **An ACP API token** (`Authorization: Bearer {token}`).

## Setup

### 1. Build the MCP server

The MCP server lives in a separate repo and must be cloned and built once:

```bash
git clone https://github.com/PonlapatSVBL/hms-acp-incident-mcp.git
cd hms-acp-incident-mcp
npm install
npm run build      # produces dist/index.js
```

### 2. Set environment variables

`.mcp.json` references these via `${VAR}` expansion, so set them in your shell/profile
before launching Claude Code:

| Variable                    | Required | Default                          | Purpose                                   |
| --------------------------- | -------- | -------------------------------- | ----------------------------------------- |
| `HMS_ACP_INCIDENT_MCP_HOME` | **Yes**  | —                                | Absolute path to your built MCP repo (the folder containing `dist/index.js`) |
| `ACP_API_TOKEN`             | **Yes**  | —                                | Bearer token for the ACP API             |
| `ACP_API_BASE_URL`          | No       | `https://api.humansoft.co.th`    | API base URL                              |
| `ACP_API_PATH`              | No       | `/api.php`                       | Front-controller path                     |
| `ACP_USER_ID`               | No       | —                                | Current user ID injection                 |
| `ACP_API_TIMEOUT_MS`        | No       | `30000`                          | Request timeout (ms)                      |

PowerShell example:

```powershell
$env:HMS_ACP_INCIDENT_MCP_HOME = "C:\path\to\hms-acp-incident-mcp"
$env:ACP_API_TOKEN = "your-jwt-token-here"
```

bash/zsh example:

```bash
export HMS_ACP_INCIDENT_MCP_HOME="/path/to/hms-acp-incident-mcp"
export ACP_API_TOKEN="your-jwt-token-here"
```

> The server config in `.mcp.json` is named `hms-acp-incident-mcp` to match the name the
> skill expects when it checks that the incident source is connected.

### 3. Install the plugin

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

- If `hms-acp-incident-mcp` is **not** connected, the skill stops and explains that the server
  must be built and connected first — it will not fabricate incidents.
- `skills/acp-incident-resolver/evals.json` contains evals for the skill. Eval #4 deliberately
  runs with the MCP disconnected to verify the precondition path.
