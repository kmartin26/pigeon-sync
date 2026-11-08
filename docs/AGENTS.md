# Documentation instructions

These rules supplement the root `AGENTS.md` for `docs/`.

- Write user-facing documentation in English and keep links relative to the
  current Markdown file. Add new documentation pages to `home.md` when relevant.
- Use `configuration.md` as the configuration entry point, the common/SFTP/FTP
  pages for option details, `setting.md` for VS Code settings, and `commands.md`
  for commands. Keep relevant examples in the root `README.md` consistent.
- Verify option names and runtime defaults against `src/modules/config.ts`,
  `schema/`, and the consuming code. Verify command IDs and labels against
  `src/constants.ts` and `package.json`; keep the public `sftp.*` namespace.
- Use placeholder hosts, usernames, and paths. Prefer prompted authentication
  over real or realistic secrets. For SSH hops, distinguish keys read locally
  from keys read on the preceding hop and explain passphrases per entry.
- State when an example can overwrite or delete files. Do not imply that a
  transfer, release, or manual VS Code check was performed unless it was.
- For documentation-only edits, check relative links, code examples, and the
  diff. Run code checks only if executable behavior also changed.
