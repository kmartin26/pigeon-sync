jest.mock('../../src/commands/abstract/createCommand', () => ({
  checkCommand: command => command,
}));

jest.mock('../../src/modules/git', () => ({
  getGitService: jest.fn(),
  // Values of the `Status` const enum in git.d.ts.
  Status: {
    INDEX_MODIFIED: 0,
    INDEX_ADDED: 1,
    INDEX_DELETED: 2,
    INDEX_RENAMED: 3,
    MODIFIED: 5,
    DELETED: 6,
    UNTRACKED: 7,
  },
}));

jest.mock('../../src/modules/serviceManager', () => ({
  getFileService: jest.fn(() => ({})),
}));

jest.mock('../../src/fileHandlers', () => ({
  uploadFile: jest.fn(),
  renameRemote: jest.fn(),
  removeRemote: jest.fn(),
}));

jest.mock('../../src/helper', () => ({
  simplifyPath: fsPath => fsPath,
}));

jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/app', () => ({
  __esModule: true,
  default: { sftpBarItem: { updateStatus: jest.fn() } },
}));

jest.mock('../../src/ui/statusBarItem', () => ({
  __esModule: true,
  default: { Status: { error: 'error' } },
}));

const { getGitService, Status } = require('../../src/modules/git');
const { uploadFile, renameRemote, removeRemote } = require('../../src/fileHandlers');
const logger = require('../../src/logger').default;
const app = require('../../src/app').default;
const command = require('../../src/commands/commandUploadChangedFiles').default;

const uri = fsPath => ({ fsPath });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Upload Changed Files', () => {
  beforeEach(() => {
    getGitService.mockReturnValue({
      repositories: [
        {
          rootUri: uri('/proj'),
          state: {
            indexChanges: [],
            workingTreeChanges: [
              { status: Status.MODIFIED, uri: uri('/proj/a.js') },
              { status: Status.UNTRACKED, uri: uri('/proj/b.js') },
              {
                status: Status.INDEX_RENAMED,
                originalUri: uri('/proj/old.js'),
                renameUri: uri('/proj/new.js'),
              },
              { status: Status.DELETED, uri: uri('/proj/c.js') },
            ],
          },
        },
      ],
    });
    renameRemote.mockResolvedValue(undefined);
    removeRemote.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('waits for the uploads before writing the result', async () => {
    const upload = deferred();
    uploadFile.mockReturnValue(upload.promise);

    let done = false;
    const run = command.handleCommand().then(() => {
      done = true;
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(done).toBe(false);
    expect(logger.log).not.toHaveBeenCalled();

    upload.resolve();
    await run;

    expect(renameRemote).toHaveBeenCalledWith(uri('/proj/old.js'), {
      originPath: '/proj/new.js',
    });
    expect(removeRemote).toHaveBeenCalledWith(uri('/proj/c.js'));
    expect(logger.log).toHaveBeenCalledWith('------ Upload Changed Files Result ------');
  });

  test('logs a failed transfer and continues', async () => {
    const error = new Error('Permission denied');
    uploadFile.mockImplementation(target =>
      target.fsPath === '/proj/a.js' ? Promise.reject(error) : Promise.resolve()
    );
    removeRemote.mockRejectedValue(error);

    await expect(command.handleCommand()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(error, 'upload /proj/a.js');
    expect(logger.error).toHaveBeenCalledWith(error, 'delete /proj/c.js');
    expect(app.sftpBarItem.updateStatus).toHaveBeenCalledWith('error');
    expect(renameRemote).toHaveBeenCalled();
  });
});
