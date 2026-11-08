# Source instructions

These rules supplement the root `AGENTS.md` for `src/`.

## Architecture and VS Code integration

- Keep command wrappers in `commands/`, transfer behavior in `fileHandlers/`,
  filesystem/protocol logic in `core/`, and editor integration in the existing
  host, UI, and module layers. Reuse those abstractions before adding new ones.
- `initCommands.ts` discovers top-level command files through webpack
  `require.context`. Preserve the `command*.ts`, `fileCommand*.ts`, and
  `fileMultiCommand*.ts` naming patterns and default-exported command options.
  For command changes, check constants, registration, `package.json`
  contributions/menus/keybindings, and `docs/commands.md` as applicable.
- Manage event subscriptions, watchers, connections, and services through the
  existing lifecycle. Preserve cleanup on cancellation, disconnection, and
  deactivation; avoid leaking listeners or pending transfers.
- `vscode` and `ssh2` are webpack externals. Changes to dependencies or imports
  must account for `webpack.config.js` and the `.vscodeignore` package allowlist,
  including runtime dependencies that must ship with `ssh2`.

## Transfer and authentication invariants

- Keep local OS paths and remote paths distinct. Follow the existing filesystem
  adapters and `core/upath.ts`; verify Windows separators where paths cross the
  local/remote boundary.
- Preserve transfer direction, ignore rules, profile/context selection,
  timestamps, and the semantics of `delete`, `skipCreate`, `ignoreExisting`, and
  `update`. A sync fix must not introduce additional deletions or overwrites.
- Preserve queue concurrency, cancellation, and file-descriptor ownership. Close
  streams and handles on both success and failure through the existing APIs.
- For SSH hops, `localPrivateKeyPath` is read locally and takes precedence over
  `privateKeyPath`. The latter is read on the preceding hop, or locally for the
  first connection. Do not accidentally read a remote key path on the local host.
- A passphrase belongs to its own connection entry; hop entries do not inherit
  the root passphrase. Preserve encrypted-key prompts and user cancellation.
  Keep loaded key material out of reusable configuration objects and logs.

## Verification

For transfer changes, exercise the algorithm in
`fileHandlers/transfer/__tests__/transfer-test.ts`. For authentication changes,
use `test/core/sshClient.spec.js` and `test/core/sshClientHop.spec.js`. Scheduler
changes have coverage in `test/core/scheduler.spec.js`. Add regression coverage
at the affected layer and follow `test/AGENTS.md` for all test code, including
colocated tests.

For UI or activation changes, when manual verification is available, run
`npm run dev` and launch an Extension Development Host with
`code --new-window --extensionDevelopmentPath="$PWD" <disposable-workspace>`, as
described in `CONTRIBUTING.md`. The **Launch Extension** configuration depends on
a legacy pre-launch task. Report whether the manual check was performed.
