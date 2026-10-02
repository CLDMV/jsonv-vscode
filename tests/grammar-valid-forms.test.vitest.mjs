/**
 *
 *	@Project: cldmv.jsonv-vscode
 *	@Filename: /tests/grammar-valid-forms.test.vitest.mjs
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
 * @fileoverview Scope assertions for the value and key forms that @cldmv/jsonv accepts
 * beyond plain JSON: internal references with member access (also inside template
 * interpolation), NaN / signed Infinity, numeric and keyword keys, $/_-prefixed keys,
 * trailing-dot / leading-dot / plus-signed decimals, numeric separators in every radix,
 * and the JSON5 string escapes. Each form must be recognized as a whole value so the
 * per-element missing-separator detection (#arrayelement / #dictionaryvalueelement)
 * neither flags it nor stops detecting a real missing comma after it.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { loadJsonvGrammar, tokenize, tokenAt, hasScope } from "./helpers/grammar.mjs";

let grammar;

beforeAll(async () => {
	grammar = await loadJsonvGrammar();
});

/**
 * @param {import("./helpers/grammar.mjs").JsonvToken} token
 * @returns {boolean}
 */
function isInvalid(token) {
	return token.scopes.some((s) => s.startsWith("invalid.illegal"));
}

/**
 * @param {string} source
 * @returns {string[]} the text of every token carrying an invalid.illegal scope
 */
function invalidTexts(source) {
	return tokenize(grammar, source)
		.filter(isInvalid)
		.map((t) => t.text);
}

describe("internal references", () => {
	it("scopes a bare reference as variable.other", () => {
		const source = "{base: 1, copy: base}";
		expect(invalidTexts(source)).toEqual([]);
		const ref = tokenAt(tokenize(grammar, source), "base", 1);
		expect(hasScope(ref, "variable.other.jsonv")).toBe(true);
		expect(hasScope(ref, "meta.reference.jsonv")).toBe(true);
	});

	it("scopes a member-access chain as one reference: variable, accessor dots, property names", () => {
		const source = "{db: {primary: {port: 5432}}, port: db.primary.port}";
		expect(invalidTexts(source)).toEqual([]);
		const tokens = tokenize(grammar, source);
		const chain = tokens.slice(tokens.findIndex((t) => t.text === "db" && hasScope(t, "variable.other.jsonv")));
		const [root, dot1, primary, dot2, port] = chain;
		expect(root.text).toBe("db");
		expect(hasScope(root, "variable.other.jsonv")).toBe(true);
		expect(hasScope(root, "variable.other.property")).toBe(false);
		for (const dot of [dot1, dot2]) {
			expect(dot.text).toBe(".");
			expect(hasScope(dot, "punctuation.accessor.jsonv")).toBe(true);
		}
		for (const [token, text] of [
			[primary, "primary"],
			[port, "port"]
		]) {
			expect(token.text).toBe(text);
			expect(hasScope(token, "variable.other.property.jsonv")).toBe(true);
		}
		// One region: every token of the chain sits in the same meta.reference scope.
		for (const token of [root, dot1, primary, dot2, port]) expect(hasScope(token, "meta.reference.jsonv")).toBe(true);
	});

	it("accepts whitespace, a comment, or a line break around a member-access dot", () => {
		expect(invalidTexts("{a: {b: 1}, x: a . b}")).toEqual([]);
		expect(invalidTexts("{a: {b: 1}, x: a /* c */ . b}")).toEqual([]);
		expect(invalidTexts("{a: {b: 1}, x: a./* c */b}")).toEqual([]);
		expect(invalidTexts("{a: {b: 1}, x: a.\n\tb}")).toEqual([]);
		expect(invalidTexts("{a: {b: 1}, x: a\n\t.b}")).toEqual([]);
		expect(invalidTexts("{a: {b: 1}, x: a. // c\n\tb}")).toEqual([]);
		const property = tokenAt(tokenize(grammar, "{a: {b: 1}, x: a.\n\tb}"), "b", 1);
		expect(hasScope(property, "variable.other.property.jsonv")).toBe(true);
	});

	it("accepts $- and _-prefixed identifiers as references", () => {
		expect(invalidTexts("{$root: 1, _base: 2, a: $root, b: _base, c: [$root, _base]}")).toEqual([]);
	});

	it("scopes references inside template interpolation", () => {
		const source = "{base: {protocol: 'https', domain: 'x.io'}, url: `${base.protocol}://${base.domain}`}";
		expect(invalidTexts(source)).toEqual([]);
		const tokens = tokenize(grammar, source);
		const protocol = tokens.find((t) => t.text === "protocol" && hasScope(t, "variable.other.property.jsonv"));
		expect(protocol).toBeDefined();
		expect(hasScope(protocol, "meta.template.expression.jsonv")).toBe(true);
		const domain = tokens.find((t) => t.text === "domain" && hasScope(t, "variable.other.property.jsonv"));
		expect(domain).toBeDefined();
	});

	it("does not treat an identifier that merely starts with a keyword as a constant", () => {
		const tokens = tokenize(grammar, "{nullable: 1, trueValue: 2, a: [nullable, trueValue]}");
		expect(tokens.filter(isInvalid)).toEqual([]);
		expect(hasScope(tokenAt(tokens, "nullable", 1), "variable.other.jsonv")).toBe(true);
		expect(hasScope(tokenAt(tokens, "trueValue", 1), "constant.language")).toBe(false);
	});

	it("still flags a missing comma after a reference", () => {
		expect(invalidTexts("[a b]")).toEqual(["b"]);
		expect(invalidTexts("[a.b c]")).toEqual(["c"]);
		expect(invalidTexts("[a.b\n\tc]")).toEqual(["c"]);
		expect(invalidTexts('{"x": a.b "y": 1}')).toEqual(['"', "y", '"', ":", "1"]);
		expect(invalidTexts("{x: a.b\n\ty: 1}")).toEqual(["y", ":", "1"]);
	});

	it("flags a member-access dot with no member name after it", () => {
		expect(invalidTexts("{a: 1, b: a.}")).toEqual(["."]);
		expect(invalidTexts("{a: {c: 1}, b: a.5}")).toContain(".");
		// the jsonv lexer reads `true` as a keyword, not a member name
		expect(invalidTexts("{a: {true: 1}, b: a.true}")).toContain(".");
	});
});

describe("NaN and signed Infinity", () => {
	it.each(["NaN", "-NaN", "Infinity", "-Infinity"])("scopes %s as constant.language as one token", (text) => {
		const tokens = tokenize(grammar, `{v: ${text}, w: [${text}, 1]}`);
		expect(tokens.filter(isInvalid)).toEqual([]);
		const token = tokenAt(tokens, text);
		expect(hasScope(token, "constant.language.jsonv")).toBe(true);
	});
});

describe("object keys", () => {
	it.each(["50", "2024", "-5", "+5", ".5", "5.", "1e3", "0xFAFAFA", "0b1010", "0o17", "8045311447n", "-Infinity"])(
		"scopes the numeric key %s as a property name",
		(key) => {
			const tokens = tokenize(grammar, `{${key}: 1, "after": 2}`);
			expect(tokens.filter(isInvalid)).toEqual([]);
			const token = tokenAt(tokens, key);
			expect(hasScope(token, "support.type.property-name.numeric.jsonv")).toBe(true);
			expect(hasScope(token, "constant.numeric")).toBe(false);
		}
	);

	it.each(["$root", "_private", "a$b_1", "true", "false", "null", "NaN", "Infinity"])("scopes the unquoted key %s as a property name", (key) => {
		const tokens = tokenize(grammar, `{${key}: 1, "after": 2}`);
		expect(tokens.filter(isInvalid)).toEqual([]);
		const token = tokenAt(tokens, key);
		expect(token.scopes).toContain("support.type.property-name.jsonv");
	});

	it("scopes a key whose colon follows an inline block comment", () => {
		const tokens = tokenize(grammar, "{a /* note */ : 1, 5 /* note */ : 2}");
		expect(tokens.filter(isInvalid)).toEqual([]);
		expect(tokenAt(tokens, "a").scopes).toContain("support.type.property-name.jsonv");
		expect(hasScope(tokenAt(tokens, "5"), "support.type.property-name.numeric.jsonv")).toBe(true);
	});

	it("still flags keys the jsonv lexer rejects", () => {
		expect(invalidTexts("{_1: 2}").length).toBeGreaterThan(0); // identifier cannot start with _ + digit
		expect(invalidTexts("{ключ: 1}").length).toBeGreaterThan(0); // identifiers are ASCII-only
		expect(invalidTexts("{ port }").length).toBeGreaterThan(0); // shorthand property
	});
});

describe("numbers", () => {
	it.each([
		["1420000.", "trailing-dot decimal"],
		["+1580000.", "plus-signed trailing-dot decimal"],
		[".05", "leading-dot decimal"],
		["+.82", "plus-signed leading-dot decimal"],
		["-.5", "minus-signed leading-dot decimal"],
		["+3", "plus-signed integer"],
		["5.e3", "trailing dot with exponent"],
		[".5e-3", "leading dot with exponent"],
		["0755", "legacy octal"],
		["-0x1F", "signed hex"],
		["0xFF_FF", "hex with separators"],
		["0b1010_1010n", "binary bigint with separators"],
		["0o7_7", "octal with separators"],
		["1_000n", "decimal bigint with separators"],
		["1_000.000_1", "decimal with separators on both sides of the point"],
		["-10n", "negative bigint"]
	])("scopes %s (%s) as a single constant.numeric token", (text) => {
		const tokens = tokenize(grammar, `{v: ${text}, w: [${text}, 1]}`);
		expect(tokens.filter(isInvalid)).toEqual([]);
		const token = tokenAt(tokens, text);
		expect(hasScope(token, "constant.numeric.jsonv")).toBe(true);
	});

	it("still flags malformed numbers", () => {
		expect(invalidTexts("[1.5n]")).toEqual(["n"]); // BigInt cannot have a decimal point
		expect(invalidTexts("[1__0]").length).toBeGreaterThan(0); // doubled separator
		expect(invalidTexts("[1_]").length).toBeGreaterThan(0); // trailing separator
		expect(invalidTexts("[0x_FF]").length).toBeGreaterThan(0); // separator after the prefix
	});
});

describe("string escapes", () => {
	it.each(["\\v", "\\0", "\\x41"])("scopes the JSON5 escape %s as constant.character.escape", (escape) => {
		const tokens = tokenize(grammar, `["a${escape}b"]`);
		expect(tokens.filter(isInvalid)).toEqual([]);
		expect(hasScope(tokenAt(tokens, escape), "constant.character.escape.jsonv")).toBe(true);
	});

	it("flags \\x and \\u escapes without enough hex digits", () => {
		expect(invalidTexts('["\\xZZ"]')).toEqual(["\\x"]);
		expect(invalidTexts('["\\u12"]')).toEqual(["\\u"]);
	});
});
