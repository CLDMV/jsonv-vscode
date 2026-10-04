# JSONV Language Support (VS Code)

VS Code language support for `.jsonv` files (JSON5 + JSONV extensions).

If you want the JSONV language specification and examples, see the main JSONV repository:
https://github.com/CLDMV/jsonv

## ✨ What's New

### Latest: v0.1.10 (October 2026)

- **Dev-tooling dependency bump ([#43](https://github.com/CLDMV/jsonv-vscode/pull/43))** — `@cldmv/fix-headers` moves from 2.1.1 to 2.1.4, the tool that maintains the repository's file headers. It produced no header changes here, so only `package.json` and the lockfile changed. The grammar and language configuration are unchanged; it's a drop-in replacement for the previous version.
- [View full v0.1.10 Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.10.md)

### Recent Releases

- **v0.1.9** (October 2026) — CI only: the in-repo PR mirror job now always runs and reports under a non-required name instead of being skipped ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.9.md))
- **v0.1.8** (October 2026) — CI only: a skipped PR-run mirror job no longer satisfies the `✅ Required PR Check` ruleset gate; `@cldmv/vitest-runner` 1.5.1 ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.8.md))
- **v0.1.7** (October 2026) — shared CLDMV fix-headers config with uniform comment headers on workflows, tests and fixtures; the packaged extension is unchanged ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.7.md))
- **v0.1.6** (September 2026) — grammar error detection now agrees with the `@cldmv/jsonv` parser (missing commas flagged, valid forms no longer painted red), and packaging moves to `@vscode/vsce` ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.6.md))

## What this extension provides

- Language registration for `.jsonv`
- Syntax highlighting via TextMate grammar
- Comment toggling for `//` and `/* */`
- Auto-closing pairs for braces, brackets, quotes, and backticks

## What this extension does not provide

- Linting or validation (use eslint-plugin-jsonv in your project ESLint config: https://github.com/CLDMV/jsonv-eslint-plugin-jsonv)

## Local development

1. Open this folder in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Open a `.jsonv` file and verify the language mode is **JSONV**.

## Packaging and install

These npm scripts are defined in [package.json](package.json):

- `npm run build` — packages the extension to a `.vsix` in the repo root.
- `npm run clean` — removes generated `.vsix` files.
- `npm run install` — builds and installs the latest `.vsix` via the VS Code CLI.

## Repo layout

- [package.json](package.json) — extension manifest and contribution points.
- [language-configuration.json](language-configuration.json) — comment syntax, brackets, and auto-closing pairs.
- [syntaxes/jsonv.tmLanguage.json](syntaxes/jsonv.tmLanguage.json) — TextMate grammar for JSONV.
- [icons/](icons/) — language icons referenced by the manifest.
