# Repository instructions

## Scope and maintenance

This file holds shared instructions for AI coding assistants. Area-specific rules
live in the scoped `AGENTS.md` files under `src/`, `test/`, `schema/`, and
`docs/`. Before editing a file, read any additional `AGENTS.md` between the
repository root and that file's directory; more specific instructions apply
within their subtree.

[CONTRIBUTING.md](CONTRIBUTING.md) is the source of truth for the project
layout, development commands, compatibility rules, and commit conventions. Do
not copy its content here; link to it and keep these files limited to rules
specific to automated assistants.

## Project

Pigeon - SFTP/FTP Sync is a TypeScript VS Code extension, descended from
vscode-sftp. Its public commands and configuration retain the `sftp` namespace.

Read the following CONTRIBUTING.md sections as needed for the task:

- [Find the relevant code](CONTRIBUTING.md#find-the-relevant-code) for entry
  points by area.
- [Keep changes compatible and focused](CONTRIBUTING.md#keep-changes-compatible-and-focused)
  for public interfaces, configuration options, and code style.
- [Build and test](CONTRIBUTING.md#build-and-test) for type checking, builds,
  Jest suites, and which checks a change needs.
- [Check packaging when relevant](CONTRIBUTING.md#check-packaging-when-relevant)
  for webpack externals and `.vscodeignore`.
- [Commit messages](CONTRIBUTING.md#commit-messages) and
  [Open a pull request](CONTRIBUTING.md#open-a-pull-request) for Conventional
  Commits titles and PR descriptions.

## Assistant-specific rules

- Run commands from the repository root with npm and the committed
  `package-lock.json`. The CI Node.js version is not the extension runtime; check
  `scripts/check-engines.js` for the runtime that extension code must support.
- Jest transpiles TypeScript without type checking. Passing tests do not replace
  `npx tsc --noEmit -p .`. Follow `test/AGENTS.md` for all test code.
- Avoid repository-wide formatting or unrelated refactors during a focused change.
- Treat `dist/`, `out/`, `node_modules/`, and `*.vsix` as generated artifacts.
  Keep AI instruction files out of VSIX packages.
- Use English for code comments and repository documentation. Respond to the user
  in their language.

## Operational boundaries

Local checks, builds, and mocked tests are normal development work. Use mocks or
disposable fixtures for transfers; do not use personal server configurations or
SSH keys for verification. Never put credentials, private keys, or passphrases in
logs, committed fixtures, documentation, or instruction files.

Live remote operations and release publication need a user request that covers
the action. In particular, `npm run pub:debug` packages files and force-pushes a
remote branch; it is not a local validation command. Do not run it as a check.
Do not squash, rewrite history, commit, or push as part of an unrelated
implementation.

Report what changed, which checks actually ran, and any remaining limitations.
Distinguish automated results from manual VS Code behavior that was not tested.
