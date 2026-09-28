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

	it("scopes an unknown escape (\\q) as constant.character.escape, since the jsonv parser reads it as the escaped character", () => {
		for (const source of ['["an unknown \\q escape"]', "{'k\\q': 'a\\zb'}", "[`a\\qb`]"]) {
			const tokens = tokenize(grammar, source);
			expect(tokens.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal"))).map((t) => t.text)).toEqual([]);
			const escapes = tokens.filter((t) => /^\\[qz]$/.test(t.text));
			expect(escapes.length).toBeGreaterThan(0);
			for (const escape of escapes) expect(hasScope(escape, "constant.character.escape.jsonv")).toBe(true);
		}
	});

	it("scopes a backslash before a line break (line continuation) as constant.character.escape", () => {
		const tokens = tokenize(grammar, '["a\\\nb", 1]');
		expect(tokens.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal")))).toEqual([]);
		expect(hasScope(tokenAt(tokens, "\\"), "constant.character.escape.jsonv")).toBe(true);
		expect(hasScope(tokenAt(tokens, "1"), "constant.numeric.jsonv")).toBe(true);
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
	it("scopes a \\x escape without two hex digits as invalid.illegal", () => {
		// The jsonv lexer rejects \x and \u escapes that lack their hex digits; every
		// other escaped character is accepted (see the "strings" tests).
		const badEscape = tokenAt(malformedTokens, "\\x");
		expect(hasScope(badEscape, "invalid.illegal.unrecognized-string-escape.jsonv")).toBe(true);
	});

	it("flags both the token that cannot start a value and the value that follows it, in an array position expecting a separator, as invalid.illegal", () => {
		// [1 : 2] — after `1`, the bare colon can't start a #value and trips the
		// array's expected-separator catch-all; since no comma ever follows, the
		// grammar keeps treating the array as still missing its separator, so `2`
		// (which — absent the missing comma — would otherwise read as a perfectly
		// legitimate second element) is flagged too.
		const flagged = malformedTokens.filter((t) => hasScope(t, "invalid.illegal.expected-array-separator.jsonv"));
		expect(flagged.length).toBeGreaterThan(0);
		expect(flagged.some((t) => t.text === ":")).toBe(true);
		expect(flagged.some((t) => t.text === "2")).toBe(true);
	});

	it("flags an orphaned second pair (missing comma) as invalid.illegal while still scoping its key as a property name", () => {
		// "missingPairSeparator": 1 "orphan": 2 — with no comma after `1`, the
		// dictionary value-slot flags the orphaned pair as invalid.illegal, but
		// "orphan" is still recognized structurally as a property name (not
		// absorbed as a plain string value the way the pre-fix grammar did), and
		// the colon that follows it is likewise inside the invalid span.
		const orphanString = tokenAt(malformedTokens, "orphan");
		expect(hasScope(orphanString, "string.quoted.double.jsonv.support.type.property-name.jsonv")).toBe(true);
		expect(hasScope(orphanString, "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(true);

		const trailingColons = malformedTokens.filter((t) => t.text === ":" && hasScope(t, "invalid.illegal.expected-dictionary-separator.jsonv"));
		expect(trailingColons.length).toBeGreaterThan(0);
	});
});

describe("missing separator (issue #19)", () => {
	it("flags every value after the first as invalid.illegal.expected-array-separator when a heterogeneous array has no commas at all", () => {
		const tokens = tokenize(grammar, '[1 "a" true]');

		const firstNumber = tokenAt(tokens, "1");
		expect(hasScope(firstNumber, "constant.numeric.jsonv")).toBe(true);
		expect(hasScope(firstNumber, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);

		const secondString = tokenAt(tokens, "a");
		expect(hasScope(secondString, "invalid.illegal.expected-array-separator.jsonv")).toBe(true);
		expect(hasScope(secondString, "string.quoted.double.jsonv")).toBe(true);

		const thirdConstant = tokenAt(tokens, "true");
		expect(hasScope(thirdConstant, "invalid.illegal.expected-array-separator.jsonv")).toBe(true);
		expect(hasScope(thirdConstant, "constant.language.jsonv")).toBe(true);
	});

	it("flags a second nested array with no comma between it and the first, while both stay fully and correctly recognized as arrays", () => {
		const tokens = tokenize(grammar, "[[1] [2]]");

		const openBrackets = tokens.filter((t) => t.text === "[" && hasScope(t, "punctuation.definition.array.begin.jsonv"));
		const closeBrackets = tokens.filter((t) => t.text === "]" && hasScope(t, "punctuation.definition.array.end.jsonv"));
		expect(openBrackets.length).toBe(3); // outer + first inner + second inner
		expect(closeBrackets.length).toBe(3); // brackets stay balanced even through the violation

		const firstInner = tokenAt(tokens, "1");
		expect(hasScope(firstInner, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);

		const secondInner = tokenAt(tokens, "2");
		expect(hasScope(secondInner, "invalid.illegal.expected-array-separator.jsonv")).toBe(true);
		expect(hasScope(secondInner, "meta.structure.array.jsonv")).toBe(true);
	});

	it('flags an orphaned key:value pair after a nested empty object value, e.g. {"a":{} "b":1}', () => {
		const tokens = tokenize(grammar, '{"a":{} "b":1}');

		const nestedObjectBraces = tokens.filter((t) => hasScope(t, "punctuation.definition.dictionary.begin.jsonv") || hasScope(t, "punctuation.definition.dictionary.end.jsonv"));
		expect(nestedObjectBraces.length).toBe(4); // outer {, nested {}, outer }

		const orphanKey = tokenAt(tokens, "b");
		expect(hasScope(orphanKey, "string.quoted.double.jsonv.support.type.property-name.jsonv")).toBe(true);
		expect(hasScope(orphanKey, "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(true);

		const orphanValue = tokenAt(tokens, "1");
		expect(hasScope(orphanValue, "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(true);
	});

	it("flags a missing comma across a newline, without flagging the legitimate first element", () => {
		const tokens = tokenize(grammar, "[1\n  2\n]");

		const first = tokenAt(tokens, "1");
		expect(hasScope(first, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);

		const second = tokenAt(tokens, "2");
		expect(hasScope(second, "invalid.illegal.expected-array-separator.jsonv")).toBe(true);
	});

	it("does NOT flag a legitimate comma-separated element that starts on the next line", () => {
		const tokens = tokenize(grammar, "[1,\n  2\n]");

		for (const text of ["1", "2"]) {
			const token = tokenAt(tokens, text);
			expect(hasScope(token, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);
		}
	});

	it("does NOT flag a trailing comma in an array or object", () => {
		const arrayTokens = tokenize(grammar, "[1, 2,]");
		for (const text of ["1", "2"]) {
			expect(hasScope(tokenAt(arrayTokens, text), "invalid.illegal.expected-array-separator.jsonv")).toBe(false);
		}

		const objectTokens = tokenize(grammar, '{"a":1,}');
		expect(hasScope(tokenAt(objectTokens, "1"), "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(false);
	});

	it("does NOT flag a value that follows a comment sitting between two properly comma-separated elements", () => {
		const tokens = tokenize(grammar, "[1, /* c */ 2]");
		const second = tokenAt(tokens, "2");
		expect(hasScope(second, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);
		expect(hasScope(second, "constant.numeric.jsonv")).toBe(true);
	});

	it("does NOT flag multi-line array/object values that are already valid (no regression on ordinary formatting)", () => {
		const tokens = tokenize(grammar, '{\n\t"a": [1,\n\t\t2,\n\t\t3\n\t],\n\t"b": {\n\t\t"c": 1\n\t}\n}');
		const numbers = tokens.filter((t) => ["1", "2", "3"].includes(t.text));
		expect(numbers.length).toBe(4); // the three array elements + "c"'s value
		for (const number of numbers) {
			expect(hasScope(number, "invalid.illegal.expected-array-separator.jsonv")).toBe(false);
			expect(hasScope(number, "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(false);
		}
		expect(hasScope(tokenAt(tokens, "c"), "invalid.illegal.expected-dictionary-separator.jsonv")).toBe(false);
	});
});

/**
 * Asserts that NO token anywhere in `source` carries any `invalid.illegal.*`
 * scope -- the strongest possible "this is valid, ordinarily-formatted input"
 * check, independent of which specific token a weaker assertion might miss.
 * @param {string} source
 */
function expectNoInvalidScopes(source) {
	const tokens = tokenize(grammar, source);
	const flagged = tokens.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal")));
	expect(flagged.map((t) => t.text)).toEqual([]);
}

describe("no false positives across line breaks (regression for the #arrayelement/#dictionaryvalueelement rework)", () => {
	// A prior fix for #19 anchored a \G lookahead to the array's/value-slot's OWN
	// entry point ("[" or ":"), which only holds when the first element sits on
	// that SAME line. Any formatter that puts "[" or ":" alone on a line (which
	// is most of them, including prettier) then pushed the first element to the
	// next line, and that stale \G anchor wrongly flagged it. The fix anchors
	// each element in its OWN freshly-entered region instead (#arrayelement /
	// #dictionaryvalueelement), found via the array's/object's own ongoing,
	// per-line pattern search -- so \G is always fresh, regardless of which
	// physical line the element land on.
	it("does not flag the first element of a plainly-formatted multi-line array", () => {
		expectNoInvalidScopes("[\n\t1,\n\t2\n]");
	});

	it("does not flag the first element of a nested array value inside an object", () => {
		expectNoInvalidScopes('{\n\t"list": [\n\t\t"a",\n\t\t"b"\n\t]\n}');
	});

	it("does not flag an object value pushed to the line after its own colon", () => {
		expectNoInvalidScopes('{\n\t"a":\n\t\t1\n}');
	});

	it("does not flag a first array element that is itself a multi-line object", () => {
		expectNoInvalidScopes('[\n\t{ "a": 1 },\n\t{ "b": 2 }\n]');
	});

	it("does not flag a plain single-line comma-separated array (sanity control)", () => {
		expectNoInvalidScopes("[1, 2]");
	});

	it("does not flag CRLF-terminated lines in an array or object", () => {
		expectNoInvalidScopes("[\r\n\t1,\r\n\t2\r\n]");
		expectNoInvalidScopes('{\r\n\t"a": 1,\r\n\t"b": 2\r\n}');
	});

	it("does not flag space-indented, tab-indented, or mixed-indentation arrays", () => {
		expectNoInvalidScopes("[\n    1,\n    2\n]");
		expectNoInvalidScopes("[\n\t1,\n\t2\n]");
		expectNoInvalidScopes("[\n \t1,\n\t 2\n]");
	});

	it("does not flag a line or block comment sitting alone on its own line between the opening bracket and the first element", () => {
		expectNoInvalidScopes("[\n\t// note\n\t1,\n\t2\n]");
		expectNoInvalidScopes("[\n\t/* note */\n\t1,\n\t2\n]");
		expectNoInvalidScopes('{\n\t"a":\n\t\t// note\n\t\t1\n}');
	});

	it("does not flag a deeply nested, fully formatted structure", () => {
		expectNoInvalidScopes('{\n\t"a": [\n\t\t{\n\t\t\t"b": [\n\t\t\t\t1,\n\t\t\t\t2\n\t\t\t]\n\t\t},\n\t\t3\n\t]\n}');
	});

	it("does not flag any #value kind when it is the first array element on its own line", () => {
		expectNoInvalidScopes('[\n\t"hello",\n\t2\n]'); // double-quoted string
		expectNoInvalidScopes("[\n\t'hello',\n\t2\n]"); // single-quoted string
		expectNoInvalidScopes("[\n\t`hi ${1}`,\n\t2\n]"); // template literal + interpolation
		expectNoInvalidScopes("[\n\t3.14,\n\t2\n]"); // float
		expectNoInvalidScopes("[\n\t0xFF,\n\t2\n]"); // hex number
		expectNoInvalidScopes("[\n\ttrue,\n\t2\n]"); // constant
		expectNoInvalidScopes("[\n\tnull,\n\t2\n]"); // constant
		expectNoInvalidScopes("[\n\t[1, 2],\n\t3\n]"); // nested array
		expectNoInvalidScopes('[\n\t{ "x": 1 },\n\t2\n]'); // nested object
	});

	it("still flags a genuinely missing comma across a newline (the fix doesn't regress detection itself)", () => {
		const tokens = tokenize(grammar, "[1\n  2\n]");
		expect(hasScope(tokenAt(tokens, "1"), "invalid.illegal.expected-array-separator.jsonv")).toBe(false);
		expect(hasScope(tokenAt(tokens, "2"), "invalid.illegal.expected-array-separator.jsonv")).toBe(true);
	});
});

/**
 * @param {string} source
 * @returns {string[]} the text of every token carrying an invalid.illegal scope
 */
function invalidTexts(source) {
	return tokenize(grammar, source)
		.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal")))
		.map((t) => t.text);
}

describe("key whose colon is on a later line (issue #25)", () => {
	it("does not flag an identifier or numeric key whose colon is on the next line", () => {
		expect(invalidTexts("{a\n: 1}")).toEqual([]);
		expect(invalidTexts("{a\n\n  : 1, b: 2}")).toEqual([]);
		expect(invalidTexts("{5\n: 1, -Infinity\n  /* c */ : 2, b // c\n: 3}")).toEqual([]);
		expect(invalidTexts("{a /* x\n y */ : 1}")).toEqual([]);
		expect(invalidTexts("{ a: 1,\n  b\n  : 2 }")).toEqual([]);
	});

	it("scopes the key as a property name and the value normally", () => {
		const tokens = tokenize(grammar, "{a\n: 1, 5\n: 2}");
		expect(tokenAt(tokens, "a").scopes).toContain("support.type.property-name.jsonv");
		expect(hasScope(tokenAt(tokens, "5"), "support.type.property-name.numeric.jsonv")).toBe(true);
		expect(hasScope(tokenAt(tokens, "1"), "constant.numeric.jsonv")).toBe(true);
		expect(hasScope(tokenAt(tokens, "2"), "constant.numeric.jsonv")).toBe(true);
	});

	it("still flags a shorthand property on one line", () => {
		expect(invalidTexts("{ port }").join("")).toBe("port");
		expect(invalidTexts("{\n  port: 8080,\n  config: { port }\n}").join("")).toBe("port");
	});

	it("flags the } or , that arrives before the colon of a key at the end of its line, and keeps scoping what follows", () => {
		const closing = tokenize(grammar, "{\n  port\n}\n[1]");
		const brace = tokenAt(closing, "}");
		expect(hasScope(brace, "invalid.illegal.expected-key-value-separator.jsonv")).toBe(true);
		expect(hasScope(brace, "punctuation.definition.dictionary.end.jsonv")).toBe(true);
		// the object closed on that }, so the array on the next line is a new root value
		const one = tokenAt(closing, "1");
		expect(hasScope(one, "meta.structure.dictionary.jsonv")).toBe(false);
		expect(hasScope(one, "constant.numeric.jsonv")).toBe(true);

		expect(invalidTexts("{ port\n, a: 1 }")).toEqual([","]);
		expect(invalidTexts("{a\n b: 1}")).toEqual(["b"]);

		const nested = tokenize(grammar, "{x: {a\n}, y: 1}");
		expect(nested.filter((t) => t.scopes.some((s) => s.startsWith("invalid.illegal"))).map((t) => t.text)).toEqual(["}"]);
		expect(tokenAt(nested, "y").scopes).toContain("support.type.property-name.jsonv");
		expect(hasScope(tokenAt(nested, "1"), "constant.numeric.jsonv")).toBe(true);
	});
});

describe("values the parser rejects (issue #25)", () => {
	it.each(["+Infinity", "+NaN", "_1", "-a", "()"])("flags %s as invalid.illegal.unrecognized-value in an array and an object", (text) => {
		const inArray = tokenize(grammar, `[${text}, 2]`);
		expect(hasScope(tokenAt(inArray, text), "invalid.illegal.unrecognized-value.jsonv")).toBe(true);
		const inObject = tokenize(grammar, `{v: ${text}, w: 2}`);
		expect(hasScope(tokenAt(inObject, text), "invalid.illegal.unrecognized-value.jsonv")).toBe(true);
	});

	it("flags both halves of a sign separated from its number (- 5)", () => {
		expect(invalidTexts("[- 5, 2]")).toEqual(["-", "5"]);
		expect(invalidTexts("{v: - 5, w: 2}")).toEqual(["-", "5"]);
	});

	it("keeps scoping the rest of the line after the invalid value", () => {
		const tokens = tokenize(grammar, "[+Infinity, 2]");
		const two = tokenAt(tokens, "2");
		expect(hasScope(two, "constant.numeric.jsonv")).toBe(true);
		expect(hasScope(two, "invalid.illegal")).toBe(false);
		expect(hasScope(tokenAt(tokens, ","), "punctuation.separator.array.jsonv")).toBe(true);
		expect(hasScope(tokenAt(tokens, "]"), "punctuation.definition.array.end.jsonv")).toBe(true);

		const object = tokenize(grammar, "{a: _1, b: 'x'}");
		expect(tokenAt(object, "b").scopes).toContain("support.type.property-name.jsonv");
		expect(hasScope(tokenAt(object, "x"), "string.quoted.single.jsonv")).toBe(true);
		expect(hasScope(tokenAt(object, "}"), "punctuation.definition.dictionary.end.jsonv")).toBe(true);
	});

	it("keeps scoping the following lines after the invalid value", () => {
		const tokens = tokenize(grammar, "{\n\ta: [+Infinity, 2],\n\tb: true\n}\n[3]");
		expect(invalidTexts("{\n\ta: [+Infinity, 2],\n\tb: true\n}\n[3]")).toEqual(["+Infinity"]);
		expect(tokenAt(tokens, "b").scopes).toContain("support.type.property-name.jsonv");
		expect(hasScope(tokenAt(tokens, "true"), "constant.language.jsonv")).toBe(true);
		const three = tokenAt(tokens, "3");
		expect(hasScope(three, "constant.numeric.jsonv")).toBe(true);
		// the object closed normally, so [3] is a new root value, not nested inside it
		expect(hasScope(three, "meta.structure.dictionary.jsonv")).toBe(false);
	});
});
