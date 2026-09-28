/**
 * @fileoverview Guards the packaged extension's file list. Runs `vsce ls` through the
 * repo's own installed `@vscode/vsce` binary (no network access, no `vsce package`
 * step) and asserts the exact set of files the .vsix would contain, so a missing
 * `.vscodeignore` — or one that stops excluding `tests/`, `.configs/`, `.github/`, etc. —
 * fails the suite instead of silently shipping an empty or bloated package.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vscePath = path.join(root, "node_modules", ".bin", "vsce");

// The exact set of files the packaged extension needs — everything else must be
// excluded by .vscodeignore. Keep this in sync with the issue's fix list.
const EXPECTED_FILES = [
	"LICENSE",
	"README.md",
	"language-configuration.json",
	"package.json",
	"icons/jsonv-dark.svg",
	"icons/jsonv-light.svg",
	"syntaxes/jsonv.tmLanguage.json"
].sort();

describe("packaged extension contents (vsce ls)", () => {
	it("has an installed vsce binary to run against", () => {
		expect(fs.existsSync(vscePath)).toBe(true);
	});

	it("lists exactly the files the extension needs — no tests/, .configs/, .github/, node_modules/, lockfiles or dotfiles", () => {
		const output = execFileSync(vscePath, ["ls"], {
			cwd: root,
			encoding: "utf8",
			timeout: 20000
		});

		const files = output
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.sort();

		expect(files).toEqual(EXPECTED_FILES);
	});
});
