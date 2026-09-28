/**
 * @fileoverview Loads the jsonv TextMate grammar (syntaxes/jsonv.tmLanguage.json) with
 * vscode-textmate + vscode-oniguruma — the same engine VS Code itself uses to tokenize
 * source files — and exposes a small tokenization helper for tests. This is not a
 * simulation of the grammar: it is the real grammar, tokenized by the real oniguruma
 * regex engine, exactly as VS Code would render it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import vscodeTextmateNs from "vscode-textmate";
const { Registry, INITIAL, parseRawGrammar } = vscodeTextmateNs;

import vscodeOnigurumaNs from "vscode-oniguruma";
const { loadWASM, OnigScanner, OnigString } = vscodeOnigurumaNs;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const GRAMMAR_PATH = path.join(root, "syntaxes/jsonv.tmLanguage.json");
export const SCOPE_NAME = "source.jsonv";

let registryPromise;

/**
 * Lazily creates (once) the vscode-textmate Registry backed by the real oniguruma WASM
 * engine, and returns a promise for the loaded jsonv grammar.
 * @returns {Promise<import("vscode-textmate").IGrammar>}
 */
export function loadJsonvGrammar() {
	if (!registryPromise) {
		registryPromise = (async () => {
			const wasmPath = path.join(root, "node_modules/vscode-oniguruma/release/onig.wasm");
			const wasmBin = fs.readFileSync(wasmPath).buffer;
			await loadWASM(wasmBin);

			const registry = new Registry({
				onigLib: Promise.resolve({
					createOnigScanner: (patterns) => new OnigScanner(patterns),
					createOnigString: (value) => new OnigString(value)
				}),
				loadGrammar: async (scopeName) => {
					if (scopeName !== SCOPE_NAME) return null;
					const content = fs.readFileSync(GRAMMAR_PATH, "utf8");
					return parseRawGrammar(content, GRAMMAR_PATH);
				}
			});

			const grammar = await registry.loadGrammar(SCOPE_NAME);
			if (!grammar) throw new Error(`failed to load grammar for scope "${SCOPE_NAME}"`);
			return grammar;
		})();
	}
	return registryPromise;
}

/**
 * @typedef {object} JsonvToken
 * @property {string} text
 * @property {string[]} scopes
 * @property {string} line
 * @property {number} lineNumber 1-based line number of `line` within the source
 */

/**
 * Tokenizes a full source string line-by-line, threading the rule stack between lines
 * the way a real editor buffer does (required for multi-line constructs: block comments,
 * template literals, nested objects/arrays).
 * @param {import("vscode-textmate").IGrammar} grammar
 * @param {string} source
 * @returns {JsonvToken[]} flat list of tokens across every line, in source order
 */
export function tokenize(grammar, source) {
	const lines = source.split(/\r\n|\r|\n/);
	let ruleStack = INITIAL;
	/** @type {JsonvToken[]} */
	const flat = [];
	for (const [index, line] of lines.entries()) {
		const { tokens, ruleStack: nextRuleStack } = grammar.tokenizeLine(line, ruleStack);
		for (const token of tokens) {
			flat.push({ text: line.substring(token.startIndex, token.endIndex), scopes: token.scopes, line, lineNumber: index + 1 });
		}
		ruleStack = nextRuleStack;
	}
	return flat;
}

/**
 * Finds every token whose exact text matches `text`, in source order. Grammar fixtures
 * are written so each interesting literal is unique within its fixture; when a fixture
 * repeats a literal, pass `occurrence` to pick a later match.
 * @param {JsonvToken[]} tokens
 * @param {string} text
 * @param {number} [occurrence]
 * @returns {JsonvToken}
 */
export function tokenAt(tokens, text, occurrence = 0) {
	const matches = tokens.filter((t) => t.text === text);
	const token = matches[occurrence];
	if (!token) {
		throw new Error(`no token with text ${JSON.stringify(text)} (occurrence ${occurrence}); found ${matches.length} match(es)`);
	}
	return token;
}

/**
 * True if `scope` (or a scope beginning with `scope.`) appears anywhere in the token's
 * scope stack — mirrors how TextMate scope selectors match (a rule for
 * "string.quoted" matches "string.quoted.double.jsonv" too).
 * @param {JsonvToken} token
 * @param {string} scope
 * @returns {boolean}
 */
export function hasScope(token, scope) {
	return token.scopes.some((s) => s === scope || s.startsWith(`${scope}.`));
}
