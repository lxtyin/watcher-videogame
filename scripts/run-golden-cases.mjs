import process from "node:process";
import {
  GOLDEN_CASES,
  runGoldenCases
} from "../packages/shared/dist/index.js";

function parseRequestedCaseId(argv) {
  const caseFlag = argv.find((arg) => arg.startsWith("--case="));

  if (caseFlag) {
    return caseFlag.slice("--case=".length);
  }

  const caseIndex = argv.indexOf("--case");

  if (caseIndex >= 0) {
    return argv[caseIndex + 1] ?? null;
  }

  return null;
}

function printBoard(label, boardLayout) {
  if (!boardLayout?.length) {
    return;
  }

  console.log(`  ${label}:`);
  for (const row of boardLayout) {
    console.log(`    ${row}`);
  }
}

function printFailureDetails(result, expectedCase) {
  for (const mismatch of result.mismatches) {
    console.log(`  - ${mismatch}`);
  }

  printBoard("Expected board", expectedCase?.expect.boardLayout ?? []);
  printBoard("Actual board", result.actual.boardLayout);
}

const requestedCaseId = parseRequestedCaseId(process.argv.slice(2));
const selectedCases = requestedCaseId
  ? GOLDEN_CASES.filter((caseDefinition) => caseDefinition.id === requestedCaseId)
  : GOLDEN_CASES;

if (!selectedCases.length) {
  console.error(
    requestedCaseId
      ? `No golden case matched "${requestedCaseId}".`
      : "No golden cases were registered."
  );
  process.exit(1);
}

const results = runGoldenCases(selectedCases);
const failedResults = results.filter((result) => !result.passed);
const casesById = new Map(selectedCases.map((caseDefinition) => [caseDefinition.id, caseDefinition]));

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.caseId} - ${result.title}`);

  if (!result.passed) {
    printFailureDetails(result, casesById.get(result.caseId));
  }
}

console.log(
  `Summary: ${results.length - failedResults.length}/${results.length} golden cases passed.`
);

if (failedResults.length) {
  process.exit(1);
}
