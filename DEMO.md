# SYZYGY CLI — Live Demo

A guided, copy-paste tour of **`syz run`** and **`syz generate`** against a tiny local
payments service. Runnable top to bottom by someone who has never seen SYZ.

- **`payments-app/`** — the System Under Test (in-memory HTTP service, driven via the SYZ HTTP executor).
- **`.syz/`** — the authored SYZ workspace (plugins, procedures, scenarios, environment, suite, knowledge layer).

Run every `syz` command from the **workspace root** (`syz-cli-demo/`).

---

## 0. Prerequisites

### a) Start the payments-app (terminal 1)

```bash
cd payments-app
npm install
PAYMENTS_TOKEN=demo-secret-token npm start        # → http://127.0.0.1:3000
```

Confirm it's up:

```bash
curl http://127.0.0.1:3000/health                 # → {"status":"ok"}
```

The endpoint surface is described canonically in
[`payments-app/api-spec/openapi.yaml`](payments-app/api-spec/openapi.yaml) and
[`payments-app/api-spec/payments.postman_collection.json`](payments-app/api-spec/payments.postman_collection.json).

### b) Prepare the SYZ terminal (terminal 2)

```bash
cd syz-cli-demo                                    # the workspace root
export PAYMENTS_TOKEN=demo-secret-token            # the refund demo + connection handle need this
syz --version                                      # the installed version
```

> The `payments_api` connection handle reads `PAYMENTS_TOKEN` from the environment (masked
> everywhere). If it isn't exported, `syz lint` / `syz run` will flag it.

---

## 1. Sanity — lint the workspace

`syz lint` statically validates every scenario, procedure, environment, and the knowledge layer —
no server needed. This workspace has **two** plugins, so lint takes a `--plugin`:

```bash
syz lint --env local --plugin payments            # → 16 scenarios ready — safe to run
syz lint --env local --plugin notifications       # → 1 scenario ready — safe to run
```

---

## 2. The 60-second run

Run the smoke suite (every green scenario under `.syz/scenarios/e2e/`) against the live app:

```bash
syz run --suite .syz/suites/smoke.suite.yaml --env local
# → 15 passed of 15
```

Open the HTML report it prints at the end (`.syz/results/<run>/index.html`) — per-scenario,
per-step, showing each step's request/response exchange and its assertions, with the full
trace and ledger one click away in the linked `debug.log` and `ledger.json`.

---

## 3. Feature tour

Each step below highlights one capability. The scenario file is named so you can open it and
read the exact YAML that produced the behaviour.

### Selecting what to run — file / directory / suite

```bash
syz run --suite .syz/scenarios/e2e/01_happy_path.yaml --env local   # one file
syz run --suite .syz/scenarios/e2e                    --env local   # a whole directory
syz run --suite .syz/suites/smoke.suite.yaml          --env local   # a curated suite manifest
```

### Slicing — tags and outline examples

```bash
syz run --suite .syz/scenarios/e2e --env local --tag smoke          # → Selected 4 of 15
syz run --suite .syz/scenarios/e2e/03_parameterized.yaml --env local --example large-order
```

`03_parameterized.yaml` runs one flow across an `examples:` table; `--example` picks a row and
`--tag` keeps rows whose tags intersect the set. You can preview a selection without running by
adding the same flags to `syz lint`.

### Send + validate, happy path and negative

- `01_happy_path.yaml` — 201 created; asserts status, `orderId`, an `ord_…` pattern, currency `in` a set, and a `matches_schema` body check.
- `02_negative_reject.yaml` — amount `0` → 400; asserts the error. (A negative test that **passes** because it asserts the rejection.)

### Workflows and overrides

- `04_workflow.yaml` — a reusable `workflow` procedure (create → validate) in one step.
- `05_workflow_override.yaml` — the same workflow with a scenario-level `overrides:` on the create step.

### Context variables — capture an id, thread it into a path

```bash
syz run --suite .syz/scenarios/e2e/06_context_variable.yaml --env local
```

`06` captures `orderId` from the create response into `ctx.var.order_id` via a `set:` block, then
a later `GET /orders/{{ ctx.var.order_id }}` reads it back.

### Waiting on async behaviour — `poll:` vs `syz.wait`

```bash
syz run --suite .syz/scenarios/e2e/07_poll_settlement.yaml --env local   # → POLL CONVERGED 5/10 attempts
syz run --suite .syz/scenarios/e2e/08_fixed_wait.yaml      --env local
```

Settlement is eventually consistent (the order flips `settling → settled` after a few seconds).
`07` uses a `poll:` block that re-runs the status check until it converges — as fast as the
system allows, as patient as the bound permits. `08` uses a fixed `syz.wait` for contrast (a
flakiness smell — prefer `poll:`).

### Auth via a connection handle + secret masking

```bash
syz run --suite .syz/scenarios/e2e/09_refund_authenticated.yaml --env local   # 201, token masked
syz run --suite .syz/scenarios/e2e/10_refund_unauthorized.yaml  --env local   # 401 (no handle attached)
```

The `payments_api` handle (in `.syz/environments/local.yaml`) carries the bearer token via
`{{ os-env-var:PAYMENTS_TOKEN }}`. `09` attaches it with `connection: payments_api`; `10` omits
it and asserts the 401. In the report the token shows as `[MASKED]`.

### Header assertions + `Set-Cookie` masking

```bash
syz run --suite .syz/scenarios/e2e/11_response_headers.yaml --env local
```

Asserts `$.headers.content-type` contains `application/json`. In the report the response's
`Set-Cookie` is auto-masked. (Tip: string operators like `contains`/`matches` use the `json`
assertion type — it can read `$.headers.*` too; the `http` type is for equality/numeric checks.)

### Query parameters

```bash
syz run --suite .syz/scenarios/e2e/12_list_orders.yaml --env local
```

### Cross-integration journey

```bash
syz run --suite .syz/scenarios/e2e/13_checkout_journey.yaml --env local
```

`13` spans **two** plugins: create an order (payments) → settle → poll until settled → notify the
customer (notifications). This is the end-to-end story behind `REQ-CHECKOUT-DOM-001`.

### Continue past a failed check — `--continue-scenario-on-failure`

`.syz/scenarios/demos/continue_on_failure.yaml` has a validate that fails on purpose, followed by
a passing one. Watch how many steps run:

```bash
syz run --suite .syz/scenarios/demos/continue_on_failure.yaml --env local
#   → stops at the failed check (2 steps run)
syz run --suite .syz/scenarios/demos/continue_on_failure.yaml --env local --continue-scenario-on-failure
#   → continues to the passing step (3 steps run); scenario still reports failure
```

### Reporting flags

```bash
syz run --suite .syz/suites/smoke.suite.yaml --env local --run-name nightly      # name the results folder
syz run --suite .syz/scenarios/e2e/01_happy_path.yaml --env local \
        --reporter junit --output report.xml                                     # CI-friendly JUnit XML
syz run --suite .syz/suites/smoke.suite.yaml --env local --live-stats            # live browser panel
```

### Requirement traceability

```bash
syz rtm        # → writes .syz/rtm.md : 0 uncovered requirements, 0 dangling covers
```

Scenarios link to requirements with `covers:`. Requirements live in each plugin's
`PLUGIN-GUIDE.yaml` (`REQ-PAYMENTS-PG-00N`, `REQ-NOTIFICATIONS-PG-00N`) and, for the
cross-integration journey, in `.syz/dossier/DOMAIN.yaml` (`REQ-CHECKOUT-DOM-001`). `syz rtm`
joins tests to requirements and flags any gaps.

### The knowledge layer (dossier)

`syz init` generated the `SYZ-*.md` reference docs under `.syz/dossier/` (start at
`SYZ-INDEX.md`; `SYZ-MANUAL.md` is the full command/format reference). `DOMAIN.yaml`,
`TEST-STRATEGY.md`, and each `PLUGIN-GUIDE.yaml` are yours — this repo has them filled in.

---

## 4. Demoing `syz generate`

The same canonical documents that describe the app can generate a plugin. `--dry-run` prints the
plan without writing, and a distinct `--name` keeps the hand-authored `payments` plugin intact:

```bash
# From the OpenAPI spec
syz generate plugin --name payments_gen \
  --from openapi:payments-app/api-spec/openapi.yaml --dry-run

# From the Postman collection
syz generate plugin --name payments_gen \
  --from postman:payments-app/api-spec/payments.postman_collection.json --dry-run
```

Drop `--dry-run` to actually scaffold (add `--yes` to skip prompts). Other sources/flags:
`--from prompt` (interactive), `--force` (regenerate from scratch), `--overwrite` (replace
selected operations only). After generating, validate with `syz lint --env local --plugin payments_gen`.

> The hand-authored `payments` plugin in this repo is a *cleaned-up* version of generated output —
> generation gives you a correct, verbose starting point; you refine it into readable tests.

---

## 5. Reset between demos

```bash
rm -rf .syz/results/*        # clear previous run folders
```

Restart the payments-app to reset its in-memory state.
