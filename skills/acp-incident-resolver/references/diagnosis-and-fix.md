# Diagnosis report & fix protocol

## The diagnosis report (Phase 3 output)

Present this to the user in Thai after you've investigated the code. The goal is that the user can decide
whether your diagnosis is right *before* any code is touched. Keep it concrete and evidence-backed — every
claim about the cause should point at real code (`path:line`), not at the card's wording.

Structure:

- **Incident**: id + one-line restatement of the problem.
- **เกี่ยวข้องกับ repo/layer ไหน**: the repo(s) and layer (CCS FE / HRS FE / api-server BE / combination),
  with the one piece of evidence that placed it there (the trace, the URL, the shared-symptom reasoning).
- **Module/feature**: where in that repo, with the key file paths.
- **สาเหตุ (root cause)**: what is actually wrong, in plain Thai, citing `file:line`. Distinguish *the cause*
  from *the symptom*.
- **ผิดตรงไหน / ทำไม**: the specific code that's wrong and why it produces the reported behavior.
- **แนวทางแก้ที่เสนอ**: what you'd change to fix it, at a level the user can approve — which files, what kind
  of change. Note any risk or side effect (does it touch shared backend logic both platforms rely on?).
- **Confidence**: `สูง` (confirmed in code), `กลาง` (strong hypothesis, one assumption unverified), `ต่ำ`
  (best guess, needs more info). Be honest — a flagged uncertainty is far more useful than false confidence.
- **คำถาม/สิ่งที่ต้องเช็คเพิ่ม**: anything you couldn't confirm and what would resolve it.

End by asking, in Thai, whether the user wants you to implement the fix. Then **stop and wait**.

### Evidence discipline
- Reproduce the bug by reading the code path, don't infer it from the title. If you claim "the total is
  wrong because tax is applied before deductions," show the lines that do that.
- If you cannot find the cause in the code, say so. Give the most likely hypothesis and the exact thing to
  check (a log, a value, which platform the reporter used). Never dress a guess up as a confirmed cause.
- Watch for shared-backend blast radius: a fix in `api-server` may affect both CCS and HRS. Call that out.

## The fix protocol (Phase 4 — only after explicit "yes")

Two hard rules, restated because they matter: **never push / PR / commit-and-push**, and **never write to
the incident card**. The user reviews everything and acts themselves.

Steps:

1. **Branch per implicated repo.** Create a new branch off the current one, named for the incident:
   ```bash
   cd .recon/<repo>
   git checkout -b fix/<INCIDENT-ID>-<short-slug>
   ```
   Use the real incident id. If two repos are involved, branch in each with the same name.

2. **Edit minimally and on-target.** Change only what the root cause requires. Resist refactoring nearby
   code, renaming, or "while I'm here" cleanups — they bloat the review and dilute the fix. The diff should
   read as "this, and only this, addresses the incident."

3. **Leave it for review — do not finalize.** Keep the edits in the working tree on the branch. Do **not**
   `git push`, open a PR, or push a commit. Committing locally is optional; if you do, make one clearly
   labeled WIP commit and still never push. The user decides what becomes of the branch.

4. **Summarize for review.** In Thai: which repo(s) and branch(es), which files changed, and a short diff or
   per-file before/after of the meaningful hunks so the user can review without opening every file. State any
   follow-up the fix implies (a migration, a config change, a second platform to verify).

5. **Draft the incident-update text — don't post it.** Produce a ready-to-paste Thai message the user can put
   on the card: current status (e.g. fix prepared, awaiting review), what was diagnosed, what was changed and
   where, and any remaining action. Hand it over as text only; do not call an MCP tool to write it.

Finish by reminding the user the changes are local, on the named branch(es), unpushed — ready for their review.

## Example branch + summary shape

```
INC-2041 "CCS payslip shows gross instead of net"
 → repo: web-ccs (FE) + api-server (BE, shared)  | cause confirmed in api-server
 → branch: fix/INC-2041-payslip-net-amount  (in api-server)
 → changed: app/Services/PayslipService.php (subtract deductions before formatting) [1 file, ~4 lines]
 → follow-up: verify HRS payslip uses the same service path; no DB change needed
 → drafted update message: «สถานะ: เตรียมแก้แล้วรอ review …»
```
