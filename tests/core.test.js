import test from "node:test";
import assert from "node:assert/strict";
import {
  demoDeals,
  validateDeal,
  validateBackup,
  statistics,
  filterDeals,
} from "../core.js";
test("forecast applies open-stage probabilities and separates closed revenue", () => {
  const base = demoDeals()[0];
  const deals = [
    { ...base, value: 100, stage: "lead" },
    { ...base, value: 200, stage: "qualified" },
    { ...base, value: 300, stage: "proposal" },
    { ...base, value: 400, stage: "won" },
    { ...base, value: 500, stage: "lost" },
  ];
  assert.deepEqual(statistics(deals), {
    openCount: 3,
    pipeline: 600,
    forecast: 360,
    won: 400,
    winRate: 50,
  });
});
test("empty pipeline avoids divide-by-zero", () =>
  assert.deepEqual(statistics([]), {
    openCount: 0,
    pipeline: 0,
    forecast: 0,
    won: 0,
    winRate: 0,
  }));
test("validation rejects invalid dates, nonfinite values, invalid stages and missing company", () => {
  const base = demoDeals()[0];
  for (const edit of [
    { closeDate: "2026-02-30" },
    { value: Infinity },
    { value: -1 },
    { stage: "fake" },
    { company: "" },
    { email: "not-an-email" },
  ])
    assert.throws(() => validateDeal({ ...base, ...edit }));
  assert.equal(validateDeal({ ...base, value: 12.345 }).value, 12.35);
});
test("backup requires schema version and unique IDs, strips unknown keys", () => {
  const base = demoDeals()[0];
  assert.throws(() => validateBackup({ version: 2, deals: [] }));
  assert.throws(() => validateBackup({ version: 1, deals: [base, base] }));
  assert.equal(
    validateBackup({
      version: 1,
      deals: [{ ...base, malicious: "ignored" }],
    })[0].malicious,
    undefined,
  );
  assert.deepEqual(validateBackup({ version: 1, deals: [] }), []);
});
test("search covers notes and contact names and combines with stage filters", () => {
  const deals = demoDeals();
  assert.equal(filterDeals(deals, "JAMIE", "lead").length, 1);
  assert.equal(filterDeals(deals, "JAMIE", "won").length, 0);
  assert.equal(filterDeals(deals, "recruitment", "open").length, 1);
});
test("demo close dates handle month boundaries and every record validates", () => {
  const deals = demoDeals(new Date(2026, 11, 28));
  assert.equal(deals[0].closeDate, "2027-01-09");
  assert.equal(validateBackup({ version: 1, deals }).length, 8);
});
