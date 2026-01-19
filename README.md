# JSONV Language Support (VS Code)

VS Code language support for `.jsonv` files (JSON5 + JSONV extensions).

If you want the JSONV language specification and examples, see the main JSONV repository:
https://github.com/CLDMV/jsonv

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
