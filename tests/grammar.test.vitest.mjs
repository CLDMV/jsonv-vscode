/**
 * @fileoverview Tokenizes representative .jsonv fixtures with the extension's own
 * TextMate grammar (syntaxes/jsonv.tmLanguage.json), through the real vscode-textmate +
 * vscode-oniguruma engine VS Code uses, and asserts the scopes the grammar assigns to
 * each construct it defines: object keys (quoted + unquoted), strings (double/single/
 * template + escapes), numbers (every numeric-literal shape the grammar's regex
 * supports), the jsonv-specific constants, comments (line/block/doc), nested structures,
 * and a handful of malformed-input cases.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJsonvGrammar, tokenize, tokenAt, hasScope } from "./helpers/grammar.mjs";

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const sampleSource = fs.readFileSync(path.join(fixturesDir, "sample.jsonv"), "utf8");
const malformedSource = fs.readFileSync(path.join(fixturesDir, "malformed.jsonv"), "utf8");

let grammar;
let sampleTokens;
let malformedTokens;

beforeAll(async () => {
	grammar = await loadJsonvGrammar();
	sampleTokens = tokenize(grammar, sampleSource);
	malformedTokens = tokenize(grammar, malformedSource);
});

describe("comments", () => {
	it("scopes a line comment", () => {
		const marker = tokenAt(sampleTokens, "//");
		expect(hasScope(marker, "comment.line.double-slash.jsonv")).toBe(true);
		expect(hasScope(marker, "punctuation.definition.comment.jsonv")).toBe(true);
	});

	it("scopes a documentation block comment (/** ... */) distinctly from a plain block comment", () => {
		const docOpen = tokenAt(sampleTokens, "/**");
		expect(hasScope(docOpen, "comment.block.documentation.jsonv")).toBe(true);

		const plainOpen = tokenAt(sampleTokens, "/*");
		expect(hasScope(plainOpen, "comment.block.jsonv")).toBe(true);
		expect(hasScope(plainOpen, "comment.block.documentation.jsonv")).toBe(false);
	});
});

describe("object keys", () => {
	it("scopes a double-quoted key as a property name, not a plain string", () => {
		const key = tokenAt(sampleTokens, "doubleKey");
		expect(hasScope(key, "string.quoted.double.jsonv.support.type.property-name.jsonv")).toBe(true);
	});

	it("scopes a single-quoted key as a property name", () => {
		const key = tokenAt(sampleTokens, "singleKey");
		expect(hasScope(key, "string.quoted.single.jsonv.support.type.property-name.jsonv")).toBe(true);
	});

	it("scopes an unquoted identifier key as support.type.property-name", () => {
		const key = tokenAt(sampleTokens, "unquotedKey");
		expect(key.scopes).toContain("support.type.property-name.jsonv");
	});
});

describe("strings", () => {
	it("scopes a double-quoted string value as string.quoted.double", () => {
		// The value half of "doubleKey": "..." — find the *value* string's quote, which
		// (unlike the key) is not also tagged support.type.property-name.
		const valueQuotes = sampleTokens.filter((t) => t.text === '"' && hasScope(t, "string.quoted.double.jsonv") && !hasScope(t, "support.type.property-name"));
		expect(valueQuotes.length).toBeGreaterThan(0);
	});

	it("scopes a recognized escape sequence as constant.character.escape", () => {
		const escaped = tokenAt(sampleTokens, '\\"');
		expect(hasScope(escaped, "constant.character.escape.jsonv")).toBe(true);
		const unicodeEscape = tokenAt(sampleTokens, "\\u0041");
		expect(hasScope(unicodeEscape, "constant.character.escape.jsonv")).toBe(true);
	});

	it("scopes a single-quoted string value", () => {
		const value = tokenAt(sampleTokens, "single-quoted value");
		expect(hasScope(value, "string.quoted.single.jsonv")).toBe(true);
	});

	it("scopes a template-literal string and its ${...} interpolation, with the interpolated value re-entering #value", () => {
		const backtick = sampleTokens.filter((t) => t.text === "`");
		expect(backtick.length).toBe(2);
		expect(hasScope(backtick[0], "string.quoted.template.jsonv")).toBe(true);

		const open = tokenAt(sampleTokens, "${");
		expect(hasScope(open, "meta.template.expression.jsonv")).toBe(true);

		const interpolatedNumber = tokenAt(sampleTokens, "99");
		expect(hasScope(interpolatedNumber, "meta.template.expression.jsonv")).toBe(true);
		expect(hasScope(interpolatedNumber, "constant.numeric.jsonv")).toBe(true);
	});
});

describe("numbers", () => {
	const cases = [
		["42", "decimal"],
		["-17", "negative decimal"],
		["3.14", "float"],
		["6.02e23", "exponent"],
		["0xFF", "hex"],
		["0o17", "octal"],
		["0b1010", "binary"],
		["10n", "bigint"],
		["1_000_000", "underscored digit groups"]
	];

	it.each(cases)("scopes %s (%s) as constant.numeric", (text) => {
		const token = tokenAt(sampleTokens, text);
		expect(hasScope(token, "constant.numeric.jsonv")).toBe(true);
	});
});

describe("constants", () => {
	const cases = ["true", "false", "null", "Infinity", "NaN"];

	it.each(cases)("scopes literal %s as constant.language", (text) => {
		const token = tokenAt(sampleTokens, text);
		expect(hasScope(token, "constant.language.jsonv")).toBe(true);
	});
});

describe("structure", () => {
	it("scopes array delimiters and nests inside meta.structure.array", () => {
		const open = tokenAt(sampleTokens, "[");
		expect(hasScope(open, "punctuation.definition.array.begin.jsonv")).toBe(true);
		const close = tokenAt(sampleTokens, "]");
		expect(hasScope(close, "punctuation.definition.array.end.jsonv")).toBe(true);

		const arrayValue = tokenAt(sampleTokens, "1");
		expect(hasScope(arrayValue, "meta.structure.array.jsonv")).toBe(true);
		expect(hasScope(arrayValue, "constant.numeric.jsonv")).toBe(true);
	});

	it("scopes object delimiters and a nested object inside its parent's value slot", () => {
		const braces = sampleTokens.filter((t) => t.text === "{");
		expect(braces.length).toBe(2); // the root object + the "nested" object
		for (const brace of braces) expect(hasScope(brace, "punctuation.definition.dictionary.begin.jsonv")).toBe(true);

		const nestedKey = tokenAt(sampleTokens, "array");
		expect(hasScope(nestedKey, "meta.structure.dictionary.jsonv")).toBe(true);
	});
});

describe("malformed input", () => {
	it("scopes an unrecognized string escape as invalid.illegal", () => {
		const badEscape = tokenAt(malformedTokens, "\\q");
		expect(hasScope(badEscape, "invalid.illegal.unrecognized-string-escape.jsonv")).toBe(true);
	});

	it("flags a token that cannot start a value, in an array position expecting a separator, as invalid.illegal", () => {
		// [1 : 2] — the grammar's #value patterns greedily re-match a second valid
		// value with no comma between (see the README caveat this run surfaced), so
		// only a token that cannot itself start a #value (like this bare colon)
		// actually trips the array's expected-separator catch-all.
		const flagged = malformedTokens.filter((t) => hasScope(t, "invalid.illegal.expected-array-separator.jsonv"));
		expect(flagged.length).toBeGreaterThan(0);
		expect(flagged.every((t) => t.text === ":")).toBe(true);
	});

	it("flags the colon of an orphaned second pair (missing comma) as invalid.illegal in the dictionary value slot", () => {
		// "missingPairSeparator": 1 "orphan": 2 — with no comma after `1`, the
		// dictionary's value-slot keeps consuming: "orphan" is absorbed as a second
		// #value (a plain string, NOT a property-name — see the grammar-behavior note
		// in the report), and it's the colon *after* "orphan" that trips
		// expected-dictionary-separator, not "orphan" itself.
		const orphanString = tokenAt(malformedTokens, "orphan");
		expect(hasScope(orphanString, "string.quoted.double.jsonv")).toBe(true);
		expect(hasScope(orphanString, "support.type.property-name")).toBe(false);

		const trailingColons = malformedTokens.filter((t) => t.text === ":" && hasScope(t, "invalid.illegal.expected-dictionary-separator.jsonv"));
		expect(trailingColons.length).toBeGreaterThan(0);
	});
});
