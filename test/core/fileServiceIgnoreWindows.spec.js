// Run FileService with Windows path semantics on every platform.
jest.mock('path', () => jest.requireActual('path').win32);

describe('FileService ignore on Windows', () => {
  const platform = process.platform;
  let ignore;

  beforeAll(() => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const { default: FileService } = require('../../src/core/fileService');
    // The service manager gives a base directory with a lower-case drive letter.
    const service = new FileService('c:\\proj', 'c:\\proj', {
      host: 'example.com',
      protocol: 'sftp',
      username: 'user',
      remotePath: '/remote',
      ignore: ['**/package.json', 'node_modules/**'],
    });
    ignore = service.getConfig().ignore;
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: platform });
  });

  test('applies the patterns whatever the case of the drive letter', () => {
    expect(ignore('c:\\proj\\package.json')).toBe(true);
    expect(ignore('C:\\proj\\package.json')).toBe(true);
    expect(ignore('C:\\proj\\node_modules\\a\\index.js')).toBe(true);
  });

  test('keeps the files that do not match', () => {
    expect(ignore('C:\\proj\\index.js')).toBe(false);
    expect(ignore('c:\\proj\\index.js')).toBe(false);
  });

  test('still handles remote paths', () => {
    expect(ignore('/remote/package.json')).toBe(true);
    expect(ignore('/remote/index.js')).toBe(false);
  });
});
