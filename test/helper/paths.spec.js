const fs = require('fs');
const { toRemotePath } = require('../../src/helper/paths');

// Real paths of the existing directories, keyed by lower-case path.
const existing = {
  '/': '/',
  '/work': '/Work',
  '/work/proj': '/Work/Proj',
};

function fakeRealpath(fsPath) {
  const realpath = existing[fsPath.toLowerCase()];
  if (realpath === undefined) {
    throw Object.assign(new Error(`ENOENT: no such file or directory, realpath '${fsPath}'`), {
      code: 'ENOENT',
    });
  }
  return realpath;
}

describe('toRemotePath on a case-insensitive file system', () => {
  const platform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    jest.spyOn(fs.realpathSync, 'native').mockImplementation(fakeRealpath);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: platform });
    jest.restoreAllMocks();
  });

  test('maps an existing path with a different casing', () => {
    expect(toRemotePath('/work/proj', '/Work/Proj', '/remote')).toBe('/remote');
  });

  test('maps a local path that does not exist yet', () => {
    expect(toRemotePath('/work/proj/new/file.txt', '/work/proj', '/remote')).toBe(
      '/remote/new/file.txt'
    );
  });

  test('fixes the casing of the existing part of a missing path', () => {
    expect(toRemotePath('/work/proj/new/file.txt', '/Work/Proj', '/remote')).toBe(
      '/remote/new/file.txt'
    );
  });

  test('throws errors other than ENOENT', () => {
    fs.realpathSync.native.mockImplementation(() => {
      throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    });

    expect(() => toRemotePath('/work/proj/file.txt', '/work/proj', '/remote')).toThrow(
      'EACCES'
    );
  });
});
