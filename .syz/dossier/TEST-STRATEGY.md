# Test Strategy

> This file is **yours**. SYZYGY scaffolds it once and never overwrites it. Record how your team tests —
> the phases, the levels, and what each is expected to cover. Scenario authors (human or AI) read this to
> decide *what* to write and at *which* level.

## What goes here

- **Test phases / levels** — the names your organisation actually uses (`component`, `integration`, `e2e`, `uat`, or your own), and what each means here. These map to the folders under `.syz/scenarios/` and to a scenario's free-form `level:` field.
- **Coverage intent** — what each level is responsible for proving, and what it deliberately does *not* (e.g. "component tests mock all downstream services; integration tests hit real staging").
- **Environments per level** — which `.syz/environments/<env>.yaml` each level runs against.
- **Entry / exit criteria** — when a level is considered done, and what gates promotion to the next.

## Levels

| Level | Scope | Environment | What it proves |
|---|---|---|---|
| component | _single service, mocked dependencies_ | local | _…_ |
| integration | _multiple real services_ | staging | _…_ |
| e2e | _full end-to-end through the stack_ | staging | _…_ |
| uat | _user-acceptance, near-production_ | uat | _…_ |

_Adjust the rows to match your conventions — SYZYGY does not enforce these names._

## Coverage intent

_For each level, state what must be covered and what is out of scope. Cross-reference `DOMAIN.yaml` for the business outcomes a passing suite is meant to guarantee._

## Test design depth (optional)

_Authors already apply the relevant techniques from `SYZ-GUIDELINES.md` → "General test case design techniques" by default — boundary-value analysis, equivalence partitioning, negative paths, state-transition, and so on, selected by the shape of each unit under test. You do **not** need to fill this in; the default produces world-class depth on its own._

_Use this section only to **tune** that default for your team. Anything you write here is layered on top of the catalogue and wins only where it directly contradicts it (e.g. capping rigor at a smoke level). For example:_

<!--
| Level       | Emphasis                                                        |
|-------------|-----------------------------------------------------------------|
| component   | Boundary-value + equivalence partitioning on every input field. |
| integration | State-transition + user-flow across real services.              |
| smoke       | Happy path only — skip boundary analysis here.                  |
-->
