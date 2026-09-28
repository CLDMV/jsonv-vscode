# JSONV Language Support (VS Code)

VS Code language support for `.jsonv` files (JSON5 + JSONV extensions).

If you want the JSONV language specification and examples, see the main JSONV repository:
https://github.com/CLDMV/jsonv

## ✨ What's New

### Latest: v0.1.6 (September 2026)

- **Grammar error detection now agrees with the `@cldmv/jsonv` parser** — a missing comma between array/object values is flagged, and valid jsonv (bare references, `NaN`/`-Infinity`, numeric keys, trailing-dot decimals, `$`-prefixed keys, and several other edge cases) no longer gets highlighted as invalid.
- **Migrated from the deprecated `vsce` package to `@vscode/vsce`**, with a `.vscodeignore` and a `package-contents` test that guard the packaged `.vsix` against shipping an empty or bloated extension.
- [View full v0.1.6 Changelog](https://github.com/CLDMV/jsonv-vscode/blob/master/docs/changelog/v0/v0.1.6.md)

### Recent Releases

- **v0.1.5** (September 2026) — bump the Node CI matrix for vitest 5 (max→26, min→22.12.0) ([Release PR](https://github.com/CLDMV/jsonv-vscode/pull/14))
- **v0.1.4** (September 2026) — adopt the v4 reusable workflow flow and sign the security cherry-pick ([Release PR](https://github.com/CLDMV/jsonv-vscode/pull/12))
- **v0.1.3** (August 2026) — bump `brace-expansion` ([Release PR](https://github.com/CLDMV/jsonv-vscode/pull/10))
- **v0.1.2** (August 2026) — derive the release base in a never-supersede concurrency group ([Release PR](https://github.com/CLDMV/jsonv-vscode/pull/7))

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
