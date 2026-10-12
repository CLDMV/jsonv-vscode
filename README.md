# JSONV Language Support (VS Code)

VS Code language support for `.jsonv` files (JSON5 + JSONV extensions).

If you want the JSONV language specification and examples, see the main JSONV repository:
https://github.com/CLDMV/jsonv

## ✨ What's New

### Latest: v0.1.11 (October 2026)

- **Test-toolchain dependency bump ([#48](https://github.com/CLDMV/jsonv-vscode/pull/48), [#49](https://github.com/CLDMV/jsonv-vscode/pull/49))** — `@cldmv/vitest-runner` moves from 1.5.1 to 1.5.3 and `vitest` from 5.0.2 to 5.0.3. The grammar, language configuration and icons are unchanged; it's a drop-in replacement for the previous version. Contributors need Node.js 22.12 or later to run the tests, because the runner raised its own Node.js floor.
- [View full v0.1.11 Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.11.md)

### Recent Releases

- **v0.1.10** (October 2026) — dev-tooling dependency bump: `@cldmv/fix-headers` 2.2.0 and `@cldmv/configs` 1.2.4 for the repository's header maintenance; the grammar and language configuration are unchanged ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.10.md))
- **v0.1.9** (October 2026) — CI only: the in-repo PR mirror job now always runs and reports under a non-required name instead of being skipped ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.9.md))
- **v0.1.8** (October 2026) — CI only: a skipped PR-run mirror job no longer satisfies the `✅ Required PR Check` ruleset gate; `@cldmv/vitest-runner` 1.5.1 ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.8.md))
- **v0.1.7** (October 2026) — shared CLDMV fix-headers config with uniform comment headers on workflows, tests and fixtures; the packaged extension is unchanged ([Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.7.md))

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
