# Contributing to Pigeon - SFTP/FTP Sync

Bug reports, documentation improvements, fixes, and features are welcome. Pigeon
is a VS Code extension for SFTP/FTP transfers and synchronization. Changes should
preserve existing users' configurations and avoid unintended file operations.

## Report a bug or suggest a feature

Check the [documentation](docs/home.md), [FAQ](FAQ.md), and
[existing issues](https://github.com/kmartin26/pigeon-sync/issues) first. Use the
issue templates when opening a report or feature request. For a substantial
feature or breaking change, discuss the proposed behavior in an issue before
investing in a large implementation.

For a bug report, include:

- Pigeon, VS Code, and operating system versions.
- The protocol in use: SFTP, FTP, or FTPS, plus relevant profile or hop settings.
- Minimal reproduction steps, expected behavior, and actual behavior.
- A sanitized configuration and relevant logs, when needed to reproduce the bug.

To collect debug logs, enable `sftp.debug`, reload VS Code, reproduce the issue,
and copy the relevant output from **View > Output > sftp**. Review logs and
configuration before sharing them: remove passwords, passphrases, private keys,
tokens, and any sensitive server or path information. Turn debug logging off
after collecting the report.

For a feature request, describe the user problem, the proposed behavior, and any
alternatives you considered.

## Set up a development checkout

Use Git, Node.js 24 with npm to match [CI](.github/workflows/ci.yml), and VS Code
for manual extension testing. The minimum supported VS Code version is declared
in [package.json](package.json), currently `^1.90.0`.

Fork [kmartin26/pigeon-sync](https://github.com/kmartin26/pigeon-sync), then replace
`YOUR_GITHUB_USERNAME` in this example:

```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/pigeon-sync.git
cd pigeon-sync
git switch -c fix/short-description
npm ci
```

Use npm and the committed `package-lock.json`. When changing dependencies, update
the manifest and lockfile together. Production dependencies also need to support
the Node.js runtime bundled with the minimum supported VS Code version;
[scripts/check-engines.js](scripts/check-engines.js) currently checks Node.js
20.9.0. A dependency working under the development Node.js version is not enough.

## Find the relevant code

| Area | Entry points |
| --- | --- |
| Extension lifecycle and command discovery | `src/extension.ts`, `src/initCommands.ts` |
| Command handlers and public IDs | `src/commands/`, `src/constants.ts` |
| Configuration loading and validation | `src/modules/config.ts`, `schema/` |
| Protocol clients, filesystems, and scheduling | `src/core/` |
| Transfer and synchronization behavior | `src/fileHandlers/` |
| Remote Explorer and editor integration | `src/modules/remoteExplorer/`, `src/host.ts`, `src/ui/` |
| Automated tests and mocks | `test/`, `src/**/__tests__/`, `__mocks__/` |
| User documentation | `README.md`, `FAQ.md`, `docs/` |

### Keep changes compatible and focused

- Preserve public `sftp.*` command IDs and settings, `.vscode/sftp.json`, and
  existing profile/context behavior. Pigeon retains these interfaces for users
  migrating from earlier SFTP extensions.
- For configuration changes, update runtime validation/defaults, consumer types,
  editor schemas, documentation, and tests together. JSON Schema suggestions do
  not set runtime defaults.
- Command discovery depends on the filename patterns in `src/initCommands.ts`.
  For a command change, check its constants, registration, `package.json`
  contributions, menus/keybindings, and `docs/commands.md` as applicable.
- Follow the surrounding code style. TypeScript generally uses two spaces,
  single quotes, and semicolons. Write comments and documentation in English.
  Keep unrelated formatting, refactors, and dependency updates out of a focused
  fix. There is no configured lint or formatter script.
- Add regression coverage for behavior changes. Exercise production code rather
  than a copy of its implementation. In particular, `test/config.spec.js`
  contains a separate Joi schema, so changing only that schema does not test the
  production configuration validator.
- Preserve transfer direction, ignore rules, cancellation, and deletion behavior.
  Use mocked clients and disposable fixtures for automated tests. Generate test
  keys at runtime; never depend on personal credentials or a live server.
- Keep generated `dist/`, `out/`, `node_modules/`, and `*.vsix` files out of
  commits. Update the sources that produce them instead.

## Build and test

Run commands from the repository root. To reproduce the main CI checks after
`npm ci`:

```sh
npx tsc --noEmit -p .
npm run check:engines
npm run compile
npm test -- --runInBand
npm audit --omit=dev
```

These commands check source types, production dependency engine compatibility,
the production webpack bundle, Jest tests, and reported production dependency
vulnerabilities. The audit needs npm registry access. CI runs `npm test` without
the optional `--runInBand`; serial execution can be useful locally.

During development, run the suites relevant to the change, for example:

```sh
npm test -- --runInBand --runTestsByPath test/core/sshClientHop.spec.js
npm test -- --runInBand --runTestsByPath src/fileHandlers/transfer/__tests__/transfer-test.ts
```

Jest discovers `test/**/*.spec.js` and `**/__tests__/*.ts`, as configured in
`package.json`. Its TypeScript preprocessor transpiles without type checking, so
tests do not replace the separate type check. `tsconfig.json` excludes `test/`;
that type-check command does not cover helpers under that directory. See
[test/AGENTS.md](test/AGENTS.md) for mock and fixture conventions.

For documentation-only changes, check relative links, examples, referenced paths,
and `git diff --check`; a full application build is unnecessary. The current CI
does not validate Markdown links. For code changes, run type checking and affected
tests; include a production build for changes to imports, command discovery,
activation, dependencies, or bundling. Dependency changes also need the engine
check and full test suite. Run the complete CI sequence before marking a code PR
ready for review when your environment allows it, and report any checks you
could not run.

### Run the extension manually

Start the webpack development build and leave it running:

```sh
npm run dev
```

Once the build succeeds, use a second terminal in the repository root to launch
an Extension Development Host. Replace the workspace path with an existing,
disposable test folder; the `code` command must be available on your PATH:

```sh
code --new-window --extensionDevelopmentPath="$PWD" /path/to/disposable-workspace
```

See the [VS Code CLI documentation](https://code.visualstudio.com/docs/configure/command-line)
if `code` is unavailable. This terminal workflow avoids the legacy pre-launch
task in `.vscode/tasks.json`. The **Launch Tests** configuration in
`.vscode/launch.json` and `test/index.ts` also belong to the legacy test runner;
use `npm test` for the maintained automated suite.

Disable other installed SFTP extensions that register the same commands in the
test window. Reload the development window after rebuilding to load new code.
For a manual transfer test, use a disposable server directory and test
credentials. Check the affected command, configuration, or Remote Explorer
behavior, plus cancellation or the opposite transfer direction when relevant.
Uploads, downloads, and syncs may overwrite files; sync deletion options may
remove files. Record the scenarios actually exercised in your PR.

### Check packaging when relevant

When changing runtime dependencies, bundled resources, or packaging rules, inspect
[webpack.config.js](webpack.config.js) and [.vscodeignore](.vscodeignore).
`vscode` and `ssh2` are webpack externals, and required runtime files must remain
available in the installed extension.

To build a local VSIX for installation testing:

```sh
npm run package
```

This invokes VSCE, runs the prepublish build, and creates a `.vsix`. Inspect and
test the package when its contents are affected; leave the artifact uncommitted.
Publishing to the Marketplace or Open VSX is a maintainer release action.
`npm run pub:debug` is a legacy script that force-pushes a remote branch; it must
not be used as a local packaging or validation command.

## Commit messages

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/),
consistent with the repository's recent history:

```text
type(scope): description
```

The scope is optional. Use a short, imperative English description, such as:

```text
fix(ssh): read hop keys from the preceding host
docs: clarify per-hop passphrase configuration
test(sync): cover ignored target files
```

| Type | Use |
| --- | --- |
| `feat` | New user-facing behavior |
| `fix` | Bug correction |
| `docs` | Documentation |
| `refactor` | Restructuring without a behavior change |
| `perf` | Performance improvement |
| `test` | Test coverage or fixtures |
| `build` | Build tooling or packaging |
| `ci` | CI workflow changes |
| `chore` | Other maintenance, including dependency updates |

Use a scope such as `ssh`, `ftp`, `sync`, `config`, `explorer`, or `deps` when it
helps locate the change. Mark an incompatible change with `!` before the colon
or a `BREAKING CHANGE:` footer. Explain the impact and migration in the body:

```text
feat!: require VS Code 1.90

BREAKING CHANGE: Users on older VS Code versions must upgrade before installing.
```

Keep each commit focused. Add a body when the motivation or tradeoffs need more
explanation, and reference a related issue when useful.

## Open a pull request

Target the `main` branch of `kmartin26/pigeon-sync`. Use the same Conventional
Commits format for the PR title so that a squash merge can retain its meaning.

Start the description with the problem and resulting behavior. Include relevant
issue links (`Closes #123` when appropriate), documentation changes, and exact
checks performed. Explain any compatibility impact, migration steps, or remaining
limitations. Keep the description proportionate to the change; there is no
100-character limit.

Before requesting review:

- Keep the diff focused and inspect it for accidental generated files or secrets.
- Add relevant regression tests and update user documentation for behavior changes.
- Report automated checks and manual scenarios, including anything not tested.
- Review the CI results on the PR and investigate failures. The repository also
  configures [CodeQL](.github/workflows/codeql-analysis.yml) and
  [DevSkim](.github/workflows/devskim-analysis.yml) security analysis workflows.

Add follow-up commits when responding to review. You do not need to squash or
rewrite your branch before opening a PR; maintainers can request history cleanup
when needed. Avoid force-pushing during review without coordinating with the
reviewers. Version bumps and release publication should be coordinated with a
maintainer.

## AI coding assistants

[AGENTS.md](AGENTS.md) provides shared repository instructions for AI coding
assistants. Read the applicable scoped instructions in [src](src/AGENTS.md),
[test](test/AGENTS.md), [schema](schema/AGENTS.md), and [docs](docs/AGENTS.md)
when working in those areas. Maintain shared rules in these files without
separate tool-specific copies. This guide remains the source of truth for project
layout, commands, and conventions; the instruction files link to it.

AI-assisted contributions follow the same compatibility, testing, commit, and
review conventions as other changes. Review generated code and verify claims
about tests before submitting. Instruction files provide context; they do not
configure permissions or authorize a commit, push, remote transfer, or release.

