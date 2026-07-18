# syz-cli-demo

A single, self-contained workspace for demoing the **SYZYGY CLI** (`syz`) end to end — every
feature of `syz run` and `syz generate`, driven over HTTP against a tiny local payments service.

```
syz-cli-demo/
├── DEMO.md              ← start here: the step-by-step demo script
├── payments-app/        ← the System Under Test (Express; api-spec/ holds openapi.yaml + Postman collection)
└── .syz/                ← the SYZ workspace
    ├── environments/local.yaml     ← base URLs + the `payments_api` connection handle
    ├── plugins/
    │   ├── payments/               ← 6 send + 8 validate + 2 workflow procedures, PLUGIN-GUIDE.yaml
    │   └── notifications/          ← a second integration (for the cross-service journey)
    ├── scenarios/
    │   ├── e2e/                    ← 13 green scenarios (the smoke suite)
    │   └── demos/                  ← continue-on-failure demo (intentionally fails)
    ├── suites/smoke.suite.yaml
    └── dossier/                    ← SYZ-* reference docs + DOMAIN.yaml + TEST-STRATEGY.md
```

## Quick start

```bash
# terminal 1 — the app
cd payments-app && npm install && PAYMENTS_TOKEN=demo-secret-token npm start

# terminal 2 — run the tests
cd syz-cli-demo
export PAYMENTS_TOKEN=demo-secret-token
syz lint --env local --plugin payments
syz run  --suite .syz/suites/smoke.suite.yaml --env local     # → 15 passed of 15
```

Then follow **[DEMO.md](DEMO.md)** for the full guided tour.

## What it showcases

Send/validate flows · negative tests · outline parameterization · `--tag` / `--example`
selection · workflows + overrides · context variables · `poll:` (eventual consistency) ·
`syz.wait` · connection handles + secret masking · header assertions + `Set-Cookie` masking ·
query params · a cross-integration journey · `--continue-scenario-on-failure` · JUnit reporting ·
requirement traceability (`syz rtm`) · and `syz generate` from OpenAPI **and** Postman.

## Requirements

Node ≥ 20 and the SYZ CLI (`npm i -g syzs-cli`). No database or external services — everything
runs on `localhost`.
