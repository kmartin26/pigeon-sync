const { EventEmitter } = require('events');
const { utils } = require('ssh2');
const {
  default: SSHClient,
  isEncryptedKeyWithoutPassphrase,
} = require('../../src/core/remote-client/sshClient');
const { ErrorCode } = require('../../src/core/remote-client/remoteClient');

// Keys are generated at test time, so no private key is committed.
const encryptedKey = utils.generateKeyPairSync('ed25519', {
  passphrase: 'secret',
  cipher: 'aes256-ctr',
  rounds: 1,
}).private;
const plainKey = utils.generateKeyPairSync('ed25519').private;

function createFakeClient() {
  const client = new EventEmitter();
  client.connect = jest.fn(() => {
    process.nextTick(() => client.emit('ready'));
  });
  client.end = jest.fn();
  return client;
}

function connect(option, answer) {
  const sshClient = new SSHClient({ host: 'example.com', port: 22 });
  const client = createFakeClient();
  const askForPasswd = jest.fn().mockResolvedValue(answer);
  const promise = sshClient._connectSSHClient(
    client,
    { host: 'example.com', port: 22, username: 'user', ...option },
    { askForPasswd }
  );
  return { promise, client, askForPasswd };
}

describe('isEncryptedKeyWithoutPassphrase', () => {
  test('detects an encrypted key', () => {
    expect(isEncryptedKeyWithoutPassphrase(encryptedKey)).toBe(true);
  });

  test('ignores an unencrypted key', () => {
    expect(isEncryptedKeyWithoutPassphrase(plainKey)).toBe(false);
  });
});

describe('SSHClient passphrase prompt', () => {
  test('asks for the passphrase of an encrypted key', async () => {
    const { promise, client, askForPasswd } = connect(
      { privateKey: encryptedKey, privateKeyPath: '/home/user/.ssh/id_ed25519' },
      'secret'
    );
    await promise;

    expect(askForPasswd).toHaveBeenCalledWith(
      '[example.com]: Enter passphrase for key /home/user/.ssh/id_ed25519'
    );
    expect(client.connect.mock.calls[0][0].passphrase).toBe('secret');
  });

  test('cancels the connection when the prompt is dismissed', async () => {
    const { promise, client } = connect({ privateKey: encryptedKey }, undefined);

    await expect(promise).rejects.toMatchObject({
      code: ErrorCode.CONNECT_CANCELLED,
    });
    expect(client.connect).not.toHaveBeenCalled();
  });

  test('does not ask when a passphrase is configured', async () => {
    const { promise, client, askForPasswd } = connect({
      privateKey: encryptedKey,
      passphrase: 'secret',
    });
    await promise;

    expect(askForPasswd).not.toHaveBeenCalled();
    expect(client.connect.mock.calls[0][0].passphrase).toBe('secret');
  });

  test('does not ask for an unencrypted key', async () => {
    const { promise, askForPasswd } = connect({ privateKey: plainKey });
    await promise;

    expect(askForPasswd).not.toHaveBeenCalled();
  });
});
