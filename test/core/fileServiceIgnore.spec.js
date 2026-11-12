const { default: FileService } = require('../../src/core/fileService');

function ignoreFn(baseDir, ignore) {
  const config = {
    host: 'example.com',
    protocol: 'sftp',
    username: 'user',
    remotePath: '/remote',
    ignore,
  };
  return { ignore: new FileService(baseDir, '/workspace', config).getConfig().ignore, config };
}

describe('FileService ignore and the config file', () => {
  test('never transfers the config file of the workspace folder', () => {
    const { ignore } = ignoreFn('/workspace', []);

    expect(ignore('/workspace/.vscode/sftp.json')).toBe(true);
    expect(ignore('/remote/.vscode/sftp.json')).toBe(true);
  });

  test('keeps the other files', () => {
    const { ignore } = ignoreFn('/workspace', []);

    expect(ignore('/workspace/.vscode/settings.json')).toBe(false);
    expect(ignore('/workspace/sub/.vscode/sftp.json')).toBe(false);
    expect(ignore('/workspace/index.html')).toBe(false);
  });

  test('applies the ignore setting too, without changing it', () => {
    const { ignore, config } = ignoreFn('/workspace', ['*.log']);

    expect(ignore('/workspace/debug.log')).toBe(true);
    expect(ignore('/workspace/.vscode/sftp.json')).toBe(true);
    expect(config.ignore).toEqual(['*.log']);
  });

  test('adds no rule when the context does not contain the config file', () => {
    expect(ignoreFn('/workspace/public', []).ignore).toBeNull();
    expect(ignoreFn('/workspace/public', ['*.log']).ignore('/workspace/public/a.log')).toBe(true);
  });
});
