# Incident MCP contract (`hms-acp-incident-mcp`)

This workflow is fed entirely by the `hms-acp-incident-mcp` server. As of writing, that server has a **spec
but is not yet built**, so this file does not hardcode its exact tool names — instead it tells you how to
discover the real tools at runtime and what operations and fields to expect. When the server is built and
connected, trust its actual tool list over anything described here.

## Step 1 — Confirm the server is connected

The incidents do not live in this skill; they live behind the MCP. Before listing anything, confirm
`hms-acp-incident-mcp` is among the connected MCP servers and look at the incident tools it exposes (their
names, descriptions, and input schemas). Use the tools exactly as their schemas describe.

If the server is **not connected**:
- Do not invent incidents, and do not substitute another source (Jira, a guess, etc.) unless the user
  explicitly asks you to.
- Tell the user plainly, in Thai, that `hms-acp-incident-mcp` isn't connected. It has a spec but needs to be
  built into a running server and connected before incidents can be pulled. The spec was most likely
  produced as an `mcp-spec.json` (e.g. from the feature-to-mcp-spec workflow); building the server from that
  spec is the prerequisite. Stop there — there's nothing to triage without it.

## Step 2 — Map the operations you need to the tools that exist

You need three capabilities. Find the connected tool that provides each (names will vary — match by what the
tool *does*, per its description and schema, not by a guessed name):

| Capability you need | Typical shape | Used in |
|---|---|---|
| **List incidents**, filterable by status and date/month | returns an array of incident summaries | Phase 1 |
| **Get one incident's full detail** by id | returns the full card | Phase 3 |
| (avoid) update/transition/comment | writes to the card | never call — see below |

If the server exposes only a single broad tool, adapt: pass the right filter arguments to it for listing,
then for detail. If it can't filter by status/month server-side, fetch and filter client-side, but prefer
server-side filters when the schema offers them.

**Do not call any tool that writes to a card** (update status, transition, add comment, assign, close). The
user handles card updates manually; this skill only ever *drafts* update text for them (see
`diagnosis-and-fix.md`). Treat write tools as out of bounds even if they're available and look convenient.

## Step 3 — Listing for "not done, this month" (Phase 1)

The user wants the incidents that still need work — to-do, in progress, reopened, on-hold, unfinished —
defaulting to the **current month**. Concretely:

- Resolve "current month" from today's date (first day 00:00 to now, or the whole calendar month — match
  whatever the tool's date filter expects).
- Exclude terminal/done states. The exact status vocabulary comes from the card data; infer the "done" set
  from what you see (e.g. anything like done/closed/resolved/cancelled) and treat the rest as actionable.
  If unsure which statuses count as done, ask the user once rather than silently dropping cards.
- Honor any override the user gave: a specific month, "all open regardless of month", a single id, or a
  platform filter (CCS-only / HRS-only).

## Expected incident card fields

The real schema comes from the connected server. These are the fields you'll typically want to read and the
role each plays — map them onto whatever the card actually calls them:

- **id / key** — stable identifier; used for branch names and the drafted update.
- **title / summary** — short statement of the problem.
- **status** — drives the "not done" filter.
- **description / steps to reproduce / expected vs actual** — the symptom detail you'll diagnose against.
- **platform / product / component** — the strongest hint for routing to CCS vs HRS vs backend. If present,
  trust it as a starting point but still confirm against the code.
- **attachments / logs / stack traces / error messages** — gold for diagnosis; a stack trace or failing URL
  often points straight at the file or endpoint.
- **priority / severity, reporter, assignee, created/updated dates** — for presenting and prioritizing the list.

When a field you'd expect is missing, work with what's there and note the gap in the diagnosis rather than
assuming a value.
