import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Anchor the project root to the package directory so include/exclude work no
// matter what cwd vitest is invoked from.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// jsonv-vscode is a declarative extension (TextMate grammar JSON + package.json
// contributions) with no JavaScript source to instrument, so there is no coverage
// block here — a coverage number over zero lines of source code isn't meaningful.
// See tests/run-vitest.mjs and the CI workflow comments for the same note.
export default defineConfig({
	root,
	test: {
		include: ["tests/**/*.test.vitest.mjs"],
		exclude: ["node_modules"],
		environment: "node",
		testTimeout: 30000,
		reporters: ["dot"]
	}
});
