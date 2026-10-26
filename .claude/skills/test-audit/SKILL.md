---
name: test-audit
description: Audit, prune or review this repo's tests. Rejects tests that repeat another test's proof, test implementation details, or catch no realistic bug, and removes them in safe batches with coverage checked before and after. Use when writing or reviewing tests here, when a change adds many tests, or when asked to slim, clean up, dedupe or audit the test suite.
---

# Test audit

The aim is fewer tests that each protect something, not a deletion count. The rules are in
`CLAUDE.md` ("Tests"); this is how to apply them.

## Gate for a new or changed test

Answer all three, or don't add the test:

1. Which behavior does it protect that a person or another client relies on?
2. Which realistic bug would make it fail?
3. Why don't the existing tests catch that bug?

Each behavior has one owner. The API contract (status codes, bodies, problem+json, headers,
database rules) belongs to `apps/api/tests`. A client's tests cover that client's own job:
the CLI's arguments, output, `--json` shape and exit codes; the TUI's keys and what it
shows; the MCP server's tool names, schemas, annotations and errors. They use a fake API
and don't re-check the API's validation rules.

## What to cut

- The same contract asserted twice: at two layers, or as near-copies that one parametrized
  test covers.
- Implementation details: call arguments or call order, private helpers, internal state,
  anything a behavior-preserving refactor would break.
- Tautologies: a mock that supplies the value being asserted, an expected value computed by
  the code under test, a copied constant.
- Tests whose name doesn't match what they exercise.
- Hooks or flags in production code that exist only for tests (remove the hook with them).

## What to keep

- The API contract, migrations and database rules, CORS and other security behavior, the
  CLI's output and exit codes, the MCP tools' contract, release packaging, and anything else
  a user or client depends on. Slow or dull isn't a reason to cut.
- One regression test per fixed bug, at the layer that owned the bug.

## Auditing one app

1. Baseline, from the app's folder: `uv run pytest` prints coverage (TOTAL, and the lines
   and branches each file misses). Note it, and count tests with `uv run pytest -q --co | tail -1`.
2. Read each test file whole, and the code it covers. Write down the contract each test
   owns, and group the ones that own the same contract.
3. In one coherent batch per file, keep the strongest test of each group and cut or merge
   (parametrize) the rest.
4. Re-run. Everything passes, and coverage isn't lower than the baseline: if a cut test was
   the only one covering a line or branch, the cut is wrong. Then `pnpm verify`.
5. Report tests and test lines before and after, coverage before and after, which contract
   each remaining file owns, and anything kept on purpose.

The web app has no unit tests yet; check its behavior in a browser when reviewing.
