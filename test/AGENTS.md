# Test instructions

These rules supplement the root `AGENTS.md` for `test/`. Also use these
conventions when changing `src/**/__tests__/` or the shared `__mocks__/`.

- Jest configuration lives in `package.json`. It discovers `test/**/*.spec.js`
  and `**/__tests__/*.ts`; use those patterns for new suites.
- `test/preprocessor.js` uses the TypeScript transpiler, without type checking.
  Run `npx tsc --noEmit -p .` separately for source changes. The compiler excludes
  `test/`, so that command does not type-check helpers under this directory.
- `test/index.ts` is a legacy VS Code/Mocha runner. The maintained `npm test`
  path is Jest; do not base new suites on the legacy launcher.
- Exercise production functions rather than copying their implementation into a
  test. In particular, `config.spec.js` contains a separate Joi schema; extending
  that copy alone does not prove `src/modules/config.ts` accepts a new option.
- Use the existing `__mocks__/vscode.js` for editor APIs. Filesystem tests can use
  `jest.mock('fs')` with `memfs` and the shared `__mocks__/fs.js` compatibility
  behavior; preserve its stream and `fs-extra` interoperability.
- Reset in-memory volumes, restore spies, and clean up timers/listeners between
  tests. Keep fixtures isolated from the real filesystem and network.
- For SSH tests, follow the fake clients in `core/sshClientHop.spec.js` and the
  test-time key generation in the SSH suites. Never read personal keys or depend
  on a reachable SSH/FTP server.
- For sync regressions, assert the source/target paths, resulting contents, and
  deletion behavior relevant to the bug, including the opposite direction when
  affected. Use `test/helper/localRemoteFs.ts` where appropriate.

Run one suite with
`npm test -- --runInBand --runTestsByPath test/core/sshClientHop.spec.js`.
Run the colocated transfer suite with
`npm test -- --runInBand --runTestsByPath src/fileHandlers/transfer/__tests__/transfer-test.ts`.
