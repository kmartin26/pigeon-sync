import * as vscode from 'vscode';
import * as path from 'path';
import logger from '../logger';
import { existsSync, realpathSync } from 'fs';
import app from '../app';
import StatusBarItem from '../ui/statusBarItem';
import { onDidOpenTextDocument, onDidSaveTextDocument, showConfirmMessage } from '../host';
import { readConfigsFromFile } from './config';
import { CONFIG_PATH } from '../constants';
import {
  createFileService,
  getFileService,
  findAllFileService,
  disposeFileService,
} from './serviceManager';
import { reportError, isValidFile, isConfigFile, isInWorkspace } from '../helper';
import { downloadFile, uploadFile } from '../fileHandlers';

// A save in the editor also fires the config file watcher, and tools such as
// git can write the file several times. Wait for the changes to settle, so the
// configuration is reloaded once.
const CONFIG_RELOAD_DELAY = 300;

let workspaceWatcher: vscode.Disposable;
let configWatcher: vscode.FileSystemWatcher | undefined;
const pendingConfigReloads = new Map<string, ReturnType<typeof setTimeout>>();

async function reloadConfig(uri: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;

  // dispose old service
  findAllFileService(service => service.workspace === workspacePath).forEach(disposeFileService);

  // create new service, unless the config file was deleted
  try {
    if (existsSync(uri.fsPath)) {
      const configs = await readConfigsFromFile(uri.fsPath);
      configs.forEach(config => createFileService(config, workspacePath));
    }
  } catch (error) {
    reportError(error);
  } finally {
    if (app.remoteExplorer) {
      app.remoteExplorer.refresh();
    }
  }
}

function scheduleConfigReload(uri: vscode.Uri) {
  const key = uri.fsPath;
  const pending = pendingConfigReloads.get(key);
  if (pending) {
    clearTimeout(pending);
  }

  pendingConfigReloads.set(
    key,
    setTimeout(() => {
      pendingConfigReloads.delete(key);
      reloadConfig(uri);
    }, CONFIG_RELOAD_DELAY)
  );
}

// Only the config file at the root of a workspace folder is loaded.
function isWorkspaceConfigFile(uri: vscode.Uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  return (
    !!workspaceFolder && path.relative(workspaceFolder.uri.fsPath, uri.fsPath) === CONFIG_PATH
  );
}

function onConfigFileEvent(uri: vscode.Uri) {
  if (!isValidFile(uri) || !isWorkspaceConfigFile(uri)) {
    return;
  }

  logger.info(`[config-change] ${uri.fsPath}`);
  scheduleConfigReload(uri);
}

function watchConfigFiles() {
  if (configWatcher) {
    configWatcher.dispose();
  }

  // Glob patterns use forward slashes on every platform.
  configWatcher = vscode.workspace.createFileSystemWatcher(
    `**/${CONFIG_PATH.split(path.sep).join('/')}`
  );
  configWatcher.onDidCreate(onConfigFileEvent);
  configWatcher.onDidChange(onConfigFileEvent);
  configWatcher.onDidDelete(onConfigFileEvent);
}

async function handleFileSave(uri: vscode.Uri) {
  const fileService = getFileService(uri);
  if (!fileService) {
    return;
  }

  const config = fileService.getConfig();
  if (config.uploadOnSave) {
    const fspath = await realpathSync.native(uri.fsPath);
    uri = vscode.Uri.file(fspath);
    logger.info(`[file-save] ${fspath}`);
    try {
      await uploadFile(uri);
    } catch (error) {
      logger.error(error, `download ${fspath}`);
      app.sftpBarItem.updateStatus(StatusBarItem.Status.error);
    }
  }
}

async function downloadOnOpen(uri: vscode.Uri) {
  const fileService = getFileService(uri);
  if (!fileService) {
    return;
  }

  const config = fileService.getConfig();
  if (config.downloadOnOpen) {
    if (config.downloadOnOpen === 'confirm') {
      const isConfirm = await showConfirmMessage('Do you want SFTP to download this file?');
      if (!isConfirm) return;
    }

    const fspath = uri.fsPath;
    logger.info(`[file-open] ${fspath}`);
    try {
      await downloadFile(uri);
    } catch (error) {
      logger.error(error, `download ${fspath}`);
      app.sftpBarItem.updateStatus(StatusBarItem.Status.error);
    }
  }
}

function watchWorkspace({
  onDidSaveFile,
  onDidSaveSftpConfig,
}: {
  onDidSaveFile: (uri: vscode.Uri) => void;
  onDidSaveSftpConfig: (uri: vscode.Uri) => void;
}) {
  if (workspaceWatcher) {
    workspaceWatcher.dispose();
  }

  workspaceWatcher = onDidSaveTextDocument((doc: vscode.TextDocument) => {
    const uri = doc.uri;
    if (!isValidFile(uri) || !isInWorkspace(uri.fsPath)) {
      return;
    }

    // remove staled cache
    if (app.fsCache.has(uri.fsPath)) {
      app.fsCache.delete(uri.fsPath);
    }

    if (isConfigFile(uri)) {
      onDidSaveSftpConfig(uri);
      return;
    }

    onDidSaveFile(uri);
  });
}

function init() {
  onDidOpenTextDocument((doc: vscode.TextDocument) => {
    if (!isValidFile(doc.uri) || !isInWorkspace(doc.uri.fsPath)) {
      return;
    }

    downloadOnOpen(doc.uri);
  });

  watchWorkspace({
    onDidSaveFile: handleFileSave,
    onDidSaveSftpConfig: scheduleConfigReload,
  });
  watchConfigFiles();
}

function destory() {
  if (workspaceWatcher) {
    workspaceWatcher.dispose();
  }

  if (configWatcher) {
    configWatcher.dispose();
    configWatcher = undefined;
  }

  pendingConfigReloads.forEach(clearTimeout);
  pendingConfigReloads.clear();
}

export default {
  init,
  destory,
};
