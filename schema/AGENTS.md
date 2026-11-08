# Configuration schema instructions

These rules supplement the root `AGENTS.md` for `schema/`.

- `package.json` connects `.vscode/sftp.json` to `config.schema.json`.
  Preserve support for both a single configuration and an array of contexts.
- Follow the existing reference chain: `config.schema.json` ->
  `simple-config.schema.json` -> protocol schemas -> `definitions.json`.
  Prefer shared definitions for shared options; keep root-only options separate
  from options allowed in profiles and hops.
- Schema defaults describe editor behavior and suggestions; they do not set
  runtime defaults. Check `src/modules/config.ts` and the consuming code before
  changing a type, default, required field, or allowed value.
- For SFTP authentication, retain `localPrivateKeyPath` precedence and the
  string/`true` passphrase behavior. Keep schema descriptions consistent with
  `README.md` and `docs/sftp_configuration.md`.
- Validate JSON syntax and resolve every changed `$ref`, including JSON Pointer
  fragments. For behavior changes, cover the production configuration validator
  and relevant consumer; a JSON parse check alone does not validate a schema.
- Update the corresponding configuration documentation for user-facing changes.
  Keep instruction Markdown excluded by `.vscodeignore` even though schema JSON
  files are shipped in the extension.
