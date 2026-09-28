/**
 * @fileoverview Validates package.json's `contributes` block against the files it
 * points at: every referenced path actually exists and parses as the file type VS Code
 * expects (JSON language-configuration, JSON TextMate grammar, SVG icons), and the
 * grammar's own scopeName / language wiring is internally consistent with what
 * package.json declares.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRAMMAR_PATH, SCOPE_NAME } from "./helpers/grammar.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function resolveFromRoot(relativePath) {
	return path.join(root, relativePath);
}

describe("package.json contributes.languages", () => {
	const language = pkg.contributes?.languages?.[0];

	it("declares exactly one language, matching the grammar's mount point", () => {
		expect(pkg.contributes.languages).toHaveLength(1);
		expect(language.id).toBe("jsonv");
		expect(language.extensions).toContain(".jsonv");
	});

	it("points configuration at a file that exists and parses as JSON", () => {
		expect(typeof language.configuration).toBe("string");
		const configPath = resolveFromRoot(language.configuration);
		expect(fs.existsSync(configPath)).toBe(true);
		const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
		expect(parsed.comments?.lineComment?.comment).toBe("//");
		expect(parsed.comments?.blockComment).toEqual(["/*", "*/"]);
	});

	it("points both icon variants at files that exist", () => {
		expect(fs.existsSync(resolveFromRoot(language.icon.light))).toBe(true);
		expect(fs.existsSync(resolveFromRoot(language.icon.dark))).toBe(true);
	});
});

describe("package.json contributes.grammars", () => {
	const grammarEntry = pkg.contributes?.grammars?.[0];

	it("declares exactly one grammar, for the jsonv language", () => {
		expect(pkg.contributes.grammars).toHaveLength(1);
		expect(grammarEntry.language).toBe(pkg.contributes.languages[0].id);
	});

	it("points path at a file that exists and parses as JSON", () => {
		const grammarPath = resolveFromRoot(grammarEntry.path);
		expect(grammarPath).toBe(GRAMMAR_PATH);
		expect(fs.existsSync(grammarPath)).toBe(true);
		expect(() => JSON.parse(fs.readFileSync(grammarPath, "utf8"))).not.toThrow();
	});

	it("declares the same scopeName the grammar file itself carries", () => {
		const grammarJson = JSON.parse(fs.readFileSync(GRAMMAR_PATH, "utf8"));
		expect(grammarEntry.scopeName).toBe(SCOPE_NAME);
		expect(grammarJson.scopeName).toBe(SCOPE_NAME);
		expect(grammarEntry.scopeName).toBe(grammarJson.scopeName);
	});
});

describe("grammar repository shape", () => {
	const grammarJson = JSON.parse(fs.readFileSync(GRAMMAR_PATH, "utf8"));

	it("roots patterns at #value (then #unrecognizedvalue) and exposes the expected named rules", () => {
		expect(grammarJson.patterns).toEqual([{ include: "#value" }, { include: "#unrecognizedvalue" }]);
		const expectedRules = ["comments", "constant", "number", "stringcontent", "string", "objectkey", "quotedobjectkey", "array", "object", "value", "unrecognizedvalue"];
		for (const rule of expectedRules) {
			expect(grammarJson.repository).toHaveProperty(rule);
		}
	});

	it("every TextMate scope name assigned by a repository rule is namespaced .jsonv", () => {
		// Walk only `repository` (not the whole document) so the grammar's own
		// display name ("name": "JSONV" at the document root) isn't mistaken for a
		// TextMate scope name.
		const scopeNames = [];
		function walk(node) {
			if (Array.isArray(node)) {
				for (const item of node) walk(item);
			} else if (node && typeof node === "object") {
				for (const [key, value] of Object.entries(node)) {
					if (key === "name" && typeof value === "string") scopeNames.push(value);
					else walk(value);
				}
			}
		}
		walk(grammarJson.repository);

		expect(scopeNames.length).toBeGreaterThan(0);
		for (const name of scopeNames) {
			expect(name.endsWith(".jsonv")).toBe(true);
		}
	});
});
