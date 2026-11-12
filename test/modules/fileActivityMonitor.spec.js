const path = require('path');
const fs = require('fs');

const WORKSPACE = path.join(path.sep, 'workspace');
const CONFIG_FILE = path.join(WORKSPACE, '.vscode', 'sftp.json');

const mockWatchers = [];
let mockSaveListener;

jest.mock('vscode', () => {
  const { EventEmitter } = require('events');
  const mockPath = require('path');
  const workspace = mockPath.join(mockPath.sep, 'workspace');
  const createEvent = (emitter, name) => listener => {
    emitter.on(name, listener);
    return { dispose: () => emitter.off(name, listener) };
  };
  return {
    workspace: {
      getWorkspaceFolder: uri =>
        uri.fsPath.startsWith(workspace + mockPath.sep) ? { uri: { fsPath: workspace } } : undefined,
      workspaceFolders: [{ uri: { fsPath: workspace } }],
      createFileSystemWatcher: jest.fn(pattern => {
        const emitter = new EventEmitter();
        const watcher = {
          pattern,
          fire: (name, uri) => emitter.emit(name, uri),
          onDidCreate: createEvent(emitter, 'create'),
          onDidChange: createEvent(emitter, 'change'),
          onDidDelete: createEvent(emitter, 'delete'),
          dispose: jest.fn(() => emitter.removeAllListeners()),
        };
        mockWatchers.push(watcher);
        return watcher;
      }),
      onDidOpenTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
      onDidSaveTextDocument: jest.fn(listener => {
        mockSaveListener = listener;
        return { dispose: jest.fn() };
      }),
    },
    window: {
      createOutputChannel: () => ({ appendLine: jest.fn(), show: jest.fn() }),
    },
  };
});

jest.mock('../../src/modules/serviceManager', () => ({
  createFileService: jest.fn(),
  getFileService: jest.fn(),
  findAllFileService: jest.fn(),
  disposeFileService: jest.fn(),
}));

jest.mock('../../src/modules/config', () => ({
  readConfigsFromFile: jest.fn(),
}));

jest.mock('../../src/fileHandlers', () => ({
  downloadFile: jest.fn(),
  uploadFile: jest.fn(),
}));

jest.mock('../../src/app', () => ({
  __esModule: true,
  default: {
    remoteExplorer: { refresh: jest.fn() },
    fsCache: { has: () => false, delete: jest.fn() },
  },
}));

jest.mock('../../src/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
}));

const serviceManager = require('../../src/modules/serviceManager');
const { readConfigsFromFile } = require('../../src/modules/config');
const fileActivityMonitor = require('../../src/modules/fileActivityMonitor').default;

const configUri = { scheme: 'file', fsPath: CONFIG_FILE };
const oldService = { workspace: WORKSPACE };
const newConfig = { name: 'new' };

describe('fileActivityMonitor config reload', () => {
  let watcher;

  beforeEach(() => {
    jest.useFakeTimers();
    mockWatchers.length = 0;
    serviceManager.findAllFileService.mockImplementation(filter =>
      [oldService].filter(filter)
    );
    readConfigsFromFile.mockResolvedValue([newConfig]);
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    fileActivityMonitor.init();
    watcher = mockWatchers[mockWatchers.length - 1];
  });

  afterEach(() => {
    fileActivityMonitor.destory();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  async function settle() {
    jest.runAllTimers();
    // let the async reload finish
    await new Promise(resolve => jest.requireActual('timers').setImmediate(resolve));
  }

  test('watches the config file with a forward slash glob', () => {
    expect(watcher.pattern).toBe('**/.vscode/sftp.json');
  });

  test('reloads the config when the file changes outside the editor', async () => {
    watcher.fire('change', configUri);
    await settle();

    expect(serviceManager.disposeFileService.mock.calls[0][0]).toBe(oldService);
    expect(readConfigsFromFile).toHaveBeenCalledWith(CONFIG_FILE);
    expect(serviceManager.createFileService).toHaveBeenCalledWith(newConfig, WORKSPACE);
  });

  test('reloads the config when the file is created', async () => {
    watcher.fire('create', configUri);
    await settle();

    expect(serviceManager.createFileService).toHaveBeenCalledWith(newConfig, WORKSPACE);
  });

  test('reloads once for a save in the editor and its watcher event', async () => {
    mockSaveListener({ uri: configUri });
    watcher.fire('change', configUri);
    await settle();

    expect(readConfigsFromFile).toHaveBeenCalledTimes(1);
    expect(serviceManager.createFileService).toHaveBeenCalledTimes(1);
  });

  test('disposes the services when the file is deleted', async () => {
    fs.existsSync.mockReturnValue(false);
    watcher.fire('delete', configUri);
    await settle();

    expect(serviceManager.disposeFileService.mock.calls[0][0]).toBe(oldService);
    expect(readConfigsFromFile).not.toHaveBeenCalled();
    expect(serviceManager.createFileService).not.toHaveBeenCalled();
  });

  test('ignores a config file outside the root of the workspace folder', async () => {
    watcher.fire('change', {
      scheme: 'file',
      fsPath: path.join(WORKSPACE, 'nested', '.vscode', 'sftp.json'),
    });
    await settle();

    expect(serviceManager.disposeFileService).not.toHaveBeenCalled();
    expect(readConfigsFromFile).not.toHaveBeenCalled();
  });

  test('cancels a pending reload when the monitor is destroyed', async () => {
    watcher.fire('change', configUri);
    fileActivityMonitor.destory();
    await settle();

    expect(readConfigsFromFile).not.toHaveBeenCalled();
    expect(watcher.dispose).toHaveBeenCalled();
  });
});
