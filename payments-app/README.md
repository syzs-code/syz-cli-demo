# payments-app

A tiny, in-memory HTTP payments service — the **System Under Test** for the SYZYGY CLI demo.
No database, no external services. Start it, point `syz run` at it, tear it down.

## Run

```bash
npm install
PAYMENTS_TOKEN=demo-secret-token npm start   # listens on http://127.0.0.1:3000
```

Environment variables:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Listen port |
| `PAYMENTS_TOKEN` | `demo-secret-token` | Bearer token required by `POST /refunds` |
| `SETTLE_DELAY_MS` | `3500` | Delay before an order flips `settling → settled` (drives the poll demo) |

Quick check: `curl http://127.0.0.1:3000/health` → `{"status":"ok"}`.

## API reference

The endpoint surface is described **canonically** in:

- [`api-spec/openapi.yaml`](./api-spec/openapi.yaml) — OpenAPI 3 spec
- [`api-spec/payments.postman_collection.json`](./api-spec/payments.postman_collection.json) — Postman collection

Those two files are the single source of truth (and the inputs to the `syz generate` demo).
This README does not restate the endpoints — read the spec or import the collection.
