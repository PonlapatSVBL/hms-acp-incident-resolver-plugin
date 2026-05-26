# Cross-repo routing & code location

Three repos, two of them frontends for different platforms, one shared backend:

| Repo | Role | Stack (detect to confirm) |
|---|---|---|
| `web-ccs` | CCS platform frontend | Angular |
| `web-hrs` | HRS platform frontend | Angular |
| `api-server` | shared backend serving both platforms | PHP (confirm framework from `composer.json`) |

Because the backend is shared, a single incident can be a frontend issue in **one** platform, a backend
issue affecting **both**, or a frontend symptom of a backend cause. The routing question is therefore not
"which repo" but "which repo(s) and which layer". Get this wrong and you'll diagnose the wrong code.

## Routing decision

Work from evidence, in this order:

1. **Read the card's platform/component field** if present — it usually tells you CCS vs HRS, and sometimes
   FE vs BE. Treat it as a strong hint, not proof.
2. **Read any error message, stack trace, or URL** in the card:
   - A frontend stack trace, a component/template name, or a route path like `/ccs/...` or `/hrs/...` → that
     platform's frontend repo.
   - An API URL (`/api/...`), an HTTP status (4xx/5xx), a PHP stack trace, or a SQL/DB error → `api-server`.
   - A wrong-data or wrong-calculation symptom (totals, tax, dates) usually lives in the backend even when
     reported as a screen bug — the frontend just renders what the API returns.
3. **Decide FE vs BE by the nature of the symptom:**
   - Layout, rendering, client validation, navigation, "button does nothing", "field not showing" → frontend.
   - Wrong values, missing/duplicated records, permission errors, 500s, slow queries → backend.
   - "Saved but didn't persist" / "shows old data" → trace both: frontend call + backend handler.
4. **If CCS and HRS share a symptom**, suspect the shared backend or a shared library before editing both
   frontends.

State the routing conclusion (repos + layer) explicitly at the top of the diagnosis so the user can sanity-check it.

## Locating code in an Angular frontend (`web-ccs` / `web-hrs`)

- **Module/feature**: `src/app` — features live under `modules/`, `features/`, or `pages/`. Match the card's
  module/screen name to a folder.
- **From a symptom to code**:
  - Screen/component issue → find the `*.component.ts` / `.html` for that screen; check bindings, `*ngIf`,
    form controls, event handlers.
  - Data/API issue → the component's injected `*.service.ts`; find the `this.http.get|post|...` call to get
    the exact endpoint, then hop to `api-server`.
  - Routing/navigation → `*-routing.module.ts` or the `Routes` array; check guards (`canActivate`).
  - Cross-cutting (auth header, error toast) → HTTP interceptors (`grep -rn HttpInterceptor src/app`).
- Useful greps:
  ```bash
  grep -rn "<module-or-text-from-card>" src/app
  grep -rnE "this\.http\.(get|post|put|patch|delete)" src/app/<feature>
  ```

## Locating code in the backend (`api-server`, PHP)

Detect the framework from `composer.json` first — routing location depends on it (Laravel `routes/`,
CodeIgniter `app/Config/Routes.php` or convention, Symfony `#[Route]` attributes, Lumen `routes/web.php`,
Slim/plain in the front controller).

From an endpoint to the cause:
1. Find the route for the URL in the card/frontend call → controller method.
2. Read the controller → service/model. Trace the logic that produces the wrong behavior.
3. For data bugs, follow into queries/Eloquent and the tables involved; for 500s, read the stack trace line
   referenced and the code around it; for permission errors, check middleware/filters and permission gates.
- Useful greps:
  ```bash
  grep -rn "<path-segment-from-the-failing-url>" routes/ app/Config/ 2>/dev/null
  grep -rn "function <suspected-method>" app/ src/ 2>/dev/null
  grep -rn "<error string from the card>" app/ src/ 2>/dev/null
  ```

## When evidence is thin

If the card has no trace/URL and the platform field is empty, narrow by the feature name: search all three
repos for the module/term and see where it resolves. If it's still ambiguous, present the top one or two
candidate locations with what each would imply, and ask the user which platform the reporter was on —
don't pick blindly and diagnose a repo you only guessed at.
