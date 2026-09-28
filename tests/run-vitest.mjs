/**
 * @fileoverview OOM-safe Vitest runner for jsonv-vscode — delegates to
 * @cldmv/vitest-runner, which spawns each test file in its own child process. There is no
 * JavaScript source in this repo (a declarative VS Code extension: TextMate grammar JSON +
 * package.json contributions), so coverage is not wired here — see .configs/vitest.config.mjs.
 *
 * Usage:
 *   node tests/run-vitest.mjs                  # run all tests
 *   node tests/run-vitest.mjs <pattern...>      # filter by path/name
 *
 *   Args before a `--` delimiter are forwarded to Vitest; args after it are test
 *   patterns. A value-taking flag needs the delimiter, e.g.:
 *     node tests/run-vitest.mjs --reporter verbose -- <pattern...>
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "@cldmv/vitest-runner";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);

// A `--` delimiter separates forwarded Vitest args (before it) from test patterns
// (after it), so a value-taking flag such as `--reporter verbose` isn't misread as a
// pattern. Without a `--`, the legacy heuristic applies: non-flag tokens are test
// patterns and flag tokens are forwarded to vitest.
const delimiter = argv.indexOf("--");
const forwarded = delimiter === -1 ? argv.filter((a) => a.startsWith("-")) : argv.slice(0, delimiter);
const testPatterns = delimiter === -1 ? argv.filter((a) => !a.startsWith("-")) : argv.slice(delimiter + 1);

// VITEST_WORKERS overrides the worker count; ignore an unset / invalid / non-positive value.
const parsedWorkers = parseInt(process.env.VITEST_WORKERS ?? "", 10);
const workers = Number.isInteger(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : 4;

const code = await run({
	cwd: root,
	testDir: "tests",
	vitestConfig: ".configs/vitest.config.mjs",
	// CLDMV standing convention: vitest test files are always named `*.test.vitest.mjs`.
	testFilePattern: /\.test\.vitest\.mjs$/,
	testPatterns,
	workers,
	vitestArgs: forwarded,
	nodeEnv: process.env.NODE_ENV || "development"
});
process.exit(code);
