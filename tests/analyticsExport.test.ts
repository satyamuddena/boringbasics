import assert from "node:assert/strict";
import test from "node:test";
import { recordsToCsv } from "../src/lib/analyticsExport";

test("raw analytics CSV preserves data and blocks spreadsheet formulas", () => {
  const csv = recordsToCsv(
    [
      {
        name: '=HYPERLINK("https://bad.example")',
        message: 'Line one, then "quoted"\nline two',
        amountPaise: 399900,
        email: null,
      },
    ],
    ["name", "message", "amountPaise", "email"],
  );

  assert.ok(csv.startsWith('\uFEFF"name","message","amountPaise","email"\r\n'));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"Line one, then ""quoted""\nline two"'));
  assert.ok(csv.endsWith('\r\n'));
});
