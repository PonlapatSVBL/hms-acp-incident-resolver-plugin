# Incident MCP contract (`hms-acp-incident-mcp`)

This workflow is fed entirely by the `hms-acp-incident-mcp` server, built from
`https://github.com/PonlapatSVBL/hms-acp-incident-mcp`. The server is started via
`node $HMS_ACP_INCIDENT_MCP_HOME/dist/index.js` and communicates over stdio.

## Step 1 — Confirm the server is connected

Before listing anything, confirm `hms-acp-incident-mcp` is among the connected MCP servers.

If it is **not connected**, stop and tell the user in Thai. Direct them to the one-time setup in
SKILL.md Phase 0 (clone → `npm install && npm run build` → set env vars). Do not invent incidents,
and do not substitute another source.

## Step 2 — server_id is required for every call

Every tool takes `server_id` as its first parameter (the ACP domain/instance identifier). If you don't
already know the value:

1. Call `getListDomains` (no required inputs) — returns the available domain list.
2. Ask the user to confirm which domain to use.
3. Pin that `server_id` for the rest of the session.

## Step 3 — Tools you will use

### Listing incidents — `getBoardLane`

Use this in Phase 1. It returns all cards in one board lane, with filtering.

| Parameter | Required | Notes |
|---|---|---|
| `server_id` | yes | domain/instance id |
| `year_month` | yes | e.g. `"2026-05"` — resolve from today's date for "current month" |
| `incident_board_type_lv` | yes | lane identifier (Pending / To do / Doing / Ready to test / Complete / Reject) |
| `keyword` | no | text search |
| `member` | no | filter by assignee |
| `feature` | no | filter by product feature |
| `incident_issue_category_type` | no | issue category filter |
| `type` | no | card type filter |
| `due_date` | no | due date filter |

To list "not done, this month": call `getBoardLane` once per non-terminal lane (To do, Doing, Ready to
test — plus Pending if warranted) and merge the results. Exclude Complete and Reject. Resolve "current
month" from today's date (`year_month` = `YYYY-MM` format).

### Getting one card's full detail — `getCard`

Use this in Phase 3 after the user has chosen an incident.

| Parameter | Required | Notes |
|---|---|---|
| `server_id` | yes | |
| `incident_id` | yes | the card's stable id from the listing |

Returns the full card including tasks, comments, members, documents, systems, and all fields useful for
diagnosis (title, description, steps to reproduce, expected vs actual, environment, links, stack traces,
attachments).

### Supporting lookups (use as needed)

| Tool | What it returns | When to use |
|---|---|---|
| `getListDomains` | domain/instance list | Phase 0 — resolve `server_id` |
| `getListUserDevProduct` | Dev/Product/Ops user list | when you need to interpret a member field |
| `getListProductFeature` | product feature hierarchy | when filtering or interpreting feature field |
| `getListIncidentGroup` | incident group/category hierarchy | when interpreting category fields |
| `getListURL` | available URLs for linking | rarely needed |
| `getListProductUpdate` | product update list | rarely needed |

## Step 4 — Write tools: never call these

The following tools **write to or mutate incident data**. Do not call any of them. When an update is
warranted, draft the text and hand it to the user to act on themselves.

| Tool | What it does |
|---|---|
| `saveCard` | changes lane, status, priority, due dates, pricing |
| `saveIncident` | edits core card data (title, description, category, etc.) |
| `addBoardTask` | adds a checklist item |
| `saveBoardTask` | edits or completes a checklist item |
| `deleteBoardTask` | removes a checklist item |
| `addBoardComment` | posts a comment |
| `saveBoardComment` | edits a comment |
| `deleteBoardComment` | removes a comment |
| `saveMember` | replaces the full member list |
| `archiveIncident` | hides card from board |
| `unArchiveIncident` | restores archived card |
| `approveIncident` | approves and moves from Pending |
| `unApproveIncident` | revokes approval |
| `changeTypeIncident` | converts Incident ↔ Requirement |
| `deleteIncident` | deletes the card (hard or soft) |
| `deleteIncidentDoc` | removes an attachment |

## Expected incident card fields

From `getCard`, the fields relevant to diagnosis:

- **incident_id** — stable identifier; used for branch names.
- **incident_topic** — card title / short problem statement.
- **incident_board_type_lv** — current lane (maps to status).
- **incident_desc** — full description, steps to reproduce, expected vs actual.
- **incident_problem** / **incident_correct** — problem statement and correct behavior.
- **environment_type** — which environment (prod / staging / dev).
- **incident_issue_category_type** — category; hints at CCS vs HRS vs backend.
- **incident_feature** — product feature; strongest routing hint alongside category.
- **incident_system** — related systems (another routing hint).
- **incident_source_link** / **incident_url** — URLs; a failing endpoint often points straight at the file.
- **priority** — for prioritizing the list.
- **members** — assignees.
- **tasks** — checklist (useful for understanding what's already been attempted).
- **comments** — thread; may contain stack traces or repro details from the reporter.
- **documents** — attachments (screenshots, logs, error files).

When a field is missing, work with what's there and note the gap in the diagnosis.
