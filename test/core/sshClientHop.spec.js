const { EventEmitter } = require('events');
const { Readable } = require('stream');
const { utils } = require('ssh2');
const { default: SSHClient } = require('../../src/core/remote-client/sshClient');
const localFs = require('../../src/core/localFs').default;

// Keys are generated at test time, so no private key is committed.
const generateKey = () => utils.generateKeyPairSync('ed25519').private;
const localKey = generateKey();
const remoteKey = generateKey();
const REMOTE_PATH = '/home/hopa/.ssh/id_rsa';

describe('SSHClient private key of an intermediate hop', () => {
  let fakeClients;
  let remoteReads;

  beforeEach(() => {
    fakeClients = [];
    remoteReads = [];
    jest.spyOn(SSHClient.prototype, '_initClient').mockImplementation(() => {
      const client = new EventEmitter();
      client.connect = jest.fn(() => {
        process.nextTick(() => client.emit('ready'));
      });
      client.end = jest.fn();
      client.forwardOut = jest.fn((srcHost, srcPort, dstHost, dstPort, cb) =>
        cb(null, new EventEmitter())
      );
      client.sftp = jest.fn(cb =>
        cb(null, {
          createReadStream: keyPath => {
            remoteReads.push(keyPath);
            return Readable.from([Buffer.from(remoteKey)]);
          },
        })
      );
      fakeClients.push(client);
      return client;
    });
    jest
      .spyOn(localFs, 'readFile')
      .mockImplementation(async () => Buffer.from(localKey));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createOption() {
    return {
      host: 'hopa',
      port: 22,
      username: 'user',
      localPrivateKeyPath: '/local/hopa',
      hop: [
        { host: 'hopb', port: 22, username: 'user', privateKeyPath: REMOTE_PATH },
        {
          host: 'target',
          port: 22,
          username: 'user',
          localPrivateKeyPath: '/local/target',
        },
      ],
    };
  }

  async function connect(option) {
    await new SSHClient(option).connect(option, {
      askForPasswd: jest.fn().mockResolvedValue(undefined),
    });
  }

  function keySentTo(host) {
    const call = fakeClients
      .flatMap(client => client.connect.mock.calls)
      .find(([option]) => option.host === host);
    return call[0].privateKey;
  }

  test('reads the key on the previous hop only', async () => {
    await connect(createOption());

    expect(remoteReads).toEqual([REMOTE_PATH]);
    expect(localFs.readFile).not.toHaveBeenCalledWith(REMOTE_PATH);
    expect(keySentTo('hopb')).toBe(remoteKey);
  });

  test('reads each local key once', async () => {
    await connect(createOption());

    expect(localFs.readFile.mock.calls.map(([keyPath]) => keyPath)).toEqual([
      '/local/hopa',
      '/local/target',
    ]);
    expect(keySentTo('hopa')).toBe(localKey);
    expect(keySentTo('target')).toBe(localKey);
  });

  test('reads the keys again on each new connection', async () => {
    const option = createOption();
    await connect(option);
    await connect(option);

    expect(remoteReads).toEqual([REMOTE_PATH, REMOTE_PATH]);
    option.hop.forEach(entry => expect(entry.privateKey).toBeUndefined());
  });
});
