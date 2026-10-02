/**
 *
 *	@Project: cldmv.jsonv-vscode
 *	@Filename: /tests/grammar-corpus.test.vitest.mjs
 *	@Date: 2026-09-28T19:26:21+00:00 (1790623581)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-02T11:31:11-07:00 (1790965871)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Tokenizes every valid jsonv fixture vendored from CLDMV/jsonv (see
 * tests/fixtures/jsonv-corpus/README.md) with the extension's TextMate grammar, through
 * the real vscode-textmate + vscode-oniguruma engine, and asserts that no token carries
 * an `invalid.illegal.*` scope. Each fixture parses with @cldmv/jsonv, so any invalid
 * scope here is the grammar failing to recognize a form the parser accepts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJsonvGrammar, tokenize } from "./helpers/grammar.mjs";

const corpusDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/jsonv-corpus");

/**
 * Recursively lists every `.jsonv` file under `dir`, skipping any `violations/` directory
 * (those hold intentionally invalid inputs in the upstream layout).
 * @param {string} dir
 * @returns {string[]} absolute paths, sorted
 */
function listFixtures(dir) {
	const found = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "violations") found.push(...listFixtures(full));
		} else if (entry.name.endsWith(".jsonv")) {
			found.push(full);
		}
	}
	return found.sort();
}

const fixtures = listFixtures(corpusDir).map((file) => [path.relative(corpusDir, file).split(path.sep).join("/"), file]);

let grammar;

beforeAll(async () => {
	grammar = await loadJsonvGrammar();
});

describe("valid jsonv corpus (CLDMV/jsonv fixtures)", () => {
	it("vendors the fixture corpus", () => {
		expect(fixtures.length).toBeGreaterThan(0);
	});

	it.each(fixtures)("%s has no invalid.illegal scopes", (_name, file) => {
		const source = fs.readFileSync(file, "utf8");
		const flagged = tokenize(grammar, source)
			.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal")))
			.map((t) => `line ${t.lineNumber}: ${JSON.stringify(t.text)} in ${JSON.stringify(t.line.trim())}`);

		expect(flagged).toEqual([]);
	});
});
