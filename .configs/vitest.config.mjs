/**
 *
 *	@Project: cldmv.jsonv-vscode
 *	@Filename: /.configs/vitest.config.mjs
 *	@Date: 2026-09-28T19:26:21+00:00 (1790623581)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T11:31:08-07:00 (1790965868)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

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
