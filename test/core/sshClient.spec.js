const { EventEmitter } = require('events');
const { utils } = require('ssh2');
const {
  default: SSHClient,
  isEncryptedKeyWithoutPassphrase,
} = require('../../src/core/remote-client/sshClient');
const { ErrorCode } = require('../../src/core/remote-client/remoteClient');
const localFs = require('../../src/core/localFs').default;

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

describe('SSHClient passphrase prompt with hops', () => {
  const keys = {
    '/keys/encrypted': encryptedKey,
    '/keys/plain': plainKey,
  };
  const encrypted = { localPrivateKeyPath: '/keys/encrypted' };
  const plain = { localPrivateKeyPath: '/keys/plain' };
  let fakeClients;

  beforeEach(() => {
    fakeClients = [];
    jest.spyOn(SSHClient.prototype, '_initClient').mockImplementation(() => {
      const client = createFakeClient();
      client.forwardOut = jest.fn((srcHost, srcPort, dstHost, dstPort, cb) =>
        cb(null, new EventEmitter())
      );
      client.sftp = jest.fn(cb => cb(null, {}));
      fakeClients.push(client);
      return client;
    });
    jest
      .spyOn(localFs, 'readFile')
      .mockImplementation(async keyPath => Buffer.from(keys[keyPath]));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function connectWithHops(option, answer) {
    const askForPasswd = jest.fn().mockResolvedValue(answer);
    const root = { port: 22, username: 'user', ...option };
    const sshClient = new SSHClient(root);
    await sshClient.connect(root, { askForPasswd });
    return askForPasswd;
  }

  function passphraseSentTo(host) {
    const call = fakeClients
      .flatMap(client => client.connect.mock.calls)
      .find(([option]) => option.host === host);
    return call[0].passphrase;
  }

  test('asks for the passphrase of the target hop', async () => {
    const askForPasswd = await connectWithHops(
      {
        host: 'hop',
        ...plain,
        hop: { host: 'target', port: 22, username: 'user', ...encrypted },
      },
      'secret'
    );

    expect(askForPasswd).toHaveBeenCalledTimes(1);
    expect(askForPasswd).toHaveBeenCalledWith(
      '[target]: Enter passphrase for key /keys/encrypted'
    );
    expect(passphraseSentTo('target')).toBe('secret');
  });

  test('asks for the passphrase of the first entry', async () => {
    const askForPasswd = await connectWithHops(
      {
        host: 'hop',
        ...encrypted,
        hop: { host: 'target', port: 22, username: 'user', ...plain },
      },
      'secret'
    );

    expect(askForPasswd).toHaveBeenCalledTimes(1);
    expect(askForPasswd).toHaveBeenCalledWith(
      '[hop]: Enter passphrase for key /keys/encrypted'
    );
    expect(passphraseSentTo('hop')).toBe('secret');
  });

  test('asks for each encrypted key with multiple hops', async () => {
    const askForPasswd = await connectWithHops(
      {
        host: 'hopa',
        ...plain,
        hop: [
          { host: 'hopb', port: 22, username: 'user', ...encrypted },
          { host: 'target', port: 22, username: 'user', ...encrypted },
        ],
      },
      'secret'
    );

    expect(askForPasswd.mock.calls.map(([prompt]) => prompt)).toEqual([
      '[hopb]: Enter passphrase for key /keys/encrypted',
      '[target]: Enter passphrase for key /keys/encrypted',
    ]);
  });

  test('a hop does not inherit the passphrase of the root config', async () => {
    const askForPasswd = await connectWithHops(
      {
        host: 'hop',
        ...encrypted,
        passphrase: 'root-secret',
        hop: { host: 'target', port: 22, username: 'user', ...encrypted },
      },
      'secret'
    );

    expect(askForPasswd).toHaveBeenCalledTimes(1);
    expect(askForPasswd).toHaveBeenCalledWith(
      '[target]: Enter passphrase for key /keys/encrypted'
    );
    expect(passphraseSentTo('hop')).toBe('root-secret');
    expect(passphraseSentTo('target')).toBe('secret');
  });

  test('does not ask when the hop has a passphrase', async () => {
    const askForPasswd = await connectWithHops({
      host: 'hop',
      ...plain,
      hop: {
        host: 'target',
        port: 22,
        username: 'user',
        ...encrypted,
        passphrase: 'secret',
      },
    });

    expect(askForPasswd).not.toHaveBeenCalled();
    expect(passphraseSentTo('target')).toBe('secret');
  });

  test('cancelling the prompt of a hop cancels the connection', async () => {
    await expect(
      connectWithHops(
        {
          host: 'hop',
          ...plain,
          hop: { host: 'target', port: 22, username: 'user', ...encrypted },
        },
        undefined
      )
    ).rejects.toMatchObject({ code: ErrorCode.CONNECT_CANCELLED });
  });
});
