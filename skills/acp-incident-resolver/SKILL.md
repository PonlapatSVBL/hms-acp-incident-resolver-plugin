---
name: acp-incident-resolver
description: >-
  Triage and resolve HumanSoft incident cards end-to-end across the company's repos. Use this whenever the
  user wants to work through incidents pulled from the hms-acp-incident-mcp server — listing the incidents
  that are open / to-do / unfinished (defaulting to the current month), picking one, diagnosing it against
  the actual code in web-ccs (CCS frontend), web-hrs (HRS frontend), and api-server (shared backend), and
  optionally implementing the fix on a review branch. Trigger this for requests like "ดู incident เดือนนี้
  ที่ยังไม่เสร็จ", "list my open incidents", "incident INC-1234 แก้ที่ไหน", "วิเคราะห์ว่า incident นี้ต้องแก้
  repo ไหน module อะไร", "ช่วยแก้ incident นี้ให้หน่อย", or any task about diagnosing and fixing HumanSoft
  CCS/HRS/api-server incidents. Talk to the user in Thai. Even a bare "มี incident อะไรต้องทำบ้าง" should
  trigger this skill.
---

# ACP Incident Resolver

A workflow for taking a HumanSoft incident from "it's on the board" to "here's exactly what's wrong, where,
and why — and optionally, here's the fix on a branch you can review." The incidents come from the
`hms-acp-incident-mcp` server; the code lives across three repos (two frontends, one shared backend). Most
of the value is in **routing the incident to the right repo/layer and diagnosing against real code**, not
guessing from the card text.

Talk to the user in Thai throughout (greetings, the incident list, the diagnosis, the questions).

## Two hard rules (safety)

These are not negotiable and the user has asked for them explicitly:

1. **Never push, open a PR, or commit-and-push.** When fixing, work on a new local branch, edit files, and
   leave the changes in the working tree for the user to review. The user reviews and decides what happens next.
2. **Never modify the incident card.** The MCP may expose write/update tools — do not call them. When an
   update is warranted, *draft* the update text and hand it to the user to paste themselves.

## The shape of the work

Five phases with two mandatory stop-and-wait checkpoints (after listing, after diagnosing). Do not run past
a checkpoint on your own initiative — the user steers which incident and whether code gets touched.

```
0. Preconditions & setup   → incident MCP connected? clone 3 repos, pin commits, detect stacks
1. List incidents          → open/to-do/unfinished for the current month (via the MCP)
2. Ask which one → STOP    ◄── checkpoint
3. Read & diagnose         → route to repo/layer, find root cause in code, report, ask "fix it?" → STOP  ◄── checkpoint
4. Fix on a branch         → only if the user said yes: branch + edit + diff summary + drafted update text
```

## Phase 0 — Preconditions & setup

**Check the incident MCP first.** This whole workflow is fed by `hms-acp-incident-mcp`. Confirm that server
is connected and inspect the incident tools it actually exposes — read `references/incident-mcp-contract.md`
for how to discover its tools at runtime and the operations to expect. If the server is **not** connected,
stop and tell the user: the MCP has a spec but must be built and connected before incidents can be listed
(it is likely the server generated from its mcp-spec.json). Do not fabricate incidents or fall back to
guessing — without the MCP there is nothing to triage.

**Clone the three repos** (override if the user gives different URLs or already-checked-out paths). Shallow
clone into a scratch workspace and pin each commit so the diagnosis is anchored to a known revision:

```bash
mkdir -p .recon && cd .recon
git clone --depth 1 https://github.com/HumanSoftTH/web-ccs.git     # CCS frontend
git clone --depth 1 https://github.com/HumanSoftTH/web-hrs.git     # HRS frontend
git clone --depth 1 https://github.com/HumanSoftTH/api-server.git  # shared backend
for r in web-ccs web-hrs api-server; do echo "$r $(git -C $r rev-parse HEAD)"; done
```

If a clone fails on credentials, stop and tell the user how to authenticate rather than guessing. You don't
need to clone all three eagerly if it's faster to clone lazily once Phase 3 knows which repo is implicated —
but having them ready makes diagnosis smoother. Detect each stack lightly (Angular version per frontend from
`package.json`; backend framework for api-server from `composer.json`) — `references/cross-repo-routing.md`
covers where things live.

## Phase 1 — List the incidents

Call the MCP's incident-listing tool for items that are **not done** — to-do, in progress, reopened,
unfinished — scoped to the **current month by default**. Honor any scope the user gave instead (a specific
month, "all open", a single incident id, a platform). Resolve "current month" from today's date.

Present the list in Thai, compact and scannable: id, title, status, and whatever the card offers that helps
the user choose (platform/CCS-or-HRS, priority, age, assignee). If the list is long, group by status or
platform. If it's empty, say so plainly — don't invent entries.

## Phase 2 — Ask which incident, then STOP

Ask the user which incident they want to work on, and **wait**. Picking one yourself defeats the point. You
may point out which look urgent or stale to help them choose, but do not start diagnosing until they answer.

## Phase 3 — Read and diagnose

Fetch the chosen incident's full detail via the MCP. Then diagnose **against the real code**, not from the
card text alone — the card describes symptoms; your job is to find the cause in the repos.

Work through `references/cross-repo-routing.md` to answer *where*, then `references/diagnosis-and-fix.md`
for *what* and *how*:

1. **Route it.** Which platform does the incident concern — CCS (`web-ccs`), HRS (`web-hrs`), or both? Is it
   a frontend problem, a backend (`api-server`) problem, or a frontend symptom of a backend cause? An
   incident often touches a frontend *and* the shared backend; identify every repo involved, not just the
   first plausible one.
2. **Locate the code.** Find the module/feature and the specific files implicated. Reproduce the reported
   behavior by reading the code path end to end (component → service → HTTP call → controller → logic/data).
3. **Find the cause.** State what is actually wrong and why, citing concrete `file:line` evidence. If you
   cannot confirm the cause from the code, say so and give the most likely hypothesis plus exactly what to
   check or what extra info is needed — never present a guess as a confirmed diagnosis.

Then present the diagnosis to the user in Thai using the report format in `references/diagnosis-and-fix.md`
(repo(s) & layer, module, root cause, where/why, proposed fix, confidence, open questions). End by asking
whether they want you to implement the fix — and **STOP** and wait. Do not start editing on your own.

## Phase 4 — Fix on a branch (only if the user says yes)

Only enter this phase on an explicit "yes, fix it" (or equivalent). Then, following the fix protocol in
`references/diagnosis-and-fix.md`:

1. In each implicated repo, create a branch named for the incident (e.g. `fix/INC-1234-short-slug`).
2. Make the minimal, targeted edits that address the root cause. Don't opportunistically refactor unrelated
   code; keep the change reviewable and scoped to the incident.
3. Leave the changes in the working tree on the branch (do **not** push, PR, or commit-and-push). Present a
   concise summary of what changed and a diff per file so the user can review.
4. Draft an incident-update message in Thai (status + what was done + any follow-up) and give it to the user
   to paste into the card themselves — do **not** call any MCP tool that writes to the card.

Close by reminding the user the changes are local on the named branch(es), unpushed, ready for their review.

## Reference files

Read these at the phase noted — don't preload everything.

- `references/incident-mcp-contract.md` — how to detect and use `hms-acp-incident-mcp` at runtime, the
  operations and card fields to expect, and what to do if it isn't connected. Read in Phase 0–1.
- `references/cross-repo-routing.md` — deciding CCS vs HRS vs api-server and frontend vs backend, and
  locating the module/files in each (Angular frontends, PHP backend). Read in Phase 0 (detect) and Phase 3.
- `references/diagnosis-and-fix.md` — the diagnosis report format, evidence/confidence discipline, the safe
  branch-and-edit fix protocol, and the drafted-update-message format. Read in Phase 3–4.
