<p align="center">
  <img src="assets/brand/logo.png" width="160" alt="Pigeon logo">
</p>

<h1 align="center">Pigeon - SFTP/FTP Sync</h1>

<p align="center">
  <strong>Carry your files to remote servers over SFTP and FTP, right from VS Code.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=kmartin26.pigeon-sync"><img src="https://vsmarketplacebadges.dev/version-short/kmartin26.pigeon-sync.svg?label=Marketplace&color=0b6fe8" alt="Marketplace version"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=kmartin26.pigeon-sync"><img src="https://vsmarketplacebadges.dev/installs-short/kmartin26.pigeon-sync.svg?color=0b6fe8" alt="Installs"></a>
  <a href="https://open-vsx.org/extension/kmartin26/pigeon-sync"><img src="https://img.shields.io/open-vsx/v/kmartin26/pigeon-sync?label=Open%20VSX&color=0b6fe8" alt="Open VSX version"></a>
  <a href="https://github.com/kmartin26/pigeon-sync/releases"><img src="https://img.shields.io/github/v/release/kmartin26/pigeon-sync?color=0b6fe8" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0b6fe8" alt="License"></a>
</p>

<p align="center">
  <a href="#installation">Install</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="docs/home.md">Documentation</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/kmartin26/pigeon-sync/issues">Report a bug</a>
</p>

---

Edit files locally and let Pigeon deliver them to your server. Pigeon syncs a local folder with a remote directory over SFTP or FTP. A few lines of configuration are enough to start, and many options cover advanced setups.

Pigeon is the actively maintained successor of [Natizyskunk's SFTP extension](https://github.com/Natizyskunk/vscode-sftp), itself forked from [liximomo's SFTP plugin](https://github.com/liximomo/vscode-sftp). It runs on current VS Code and Node versions and keeps evolving.

## Features

- **Upload on save**: every save goes straight to the server.
- **Sync both ways**: local to remote, remote to local, or both directions.
- **Diff local and remote**: compare a file with its remote copy before you overwrite anything.
- **Remote Explorer**: browse, open and download remote files from the Activity Bar.
- **File watcher**: upload or delete files changed by external tools (build output, generators).
- **Profiles and multiple contexts**: switch between dev and prod, or map several folders to several servers.
- **Connection hopping**: reach a target server through one or more SSH hops, with keys read locally or on the hop.
- **Temp files**: view remote content without touching your workspace.

## Installation

**From the Marketplace**: search for **Pigeon** in the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`), or run:

```sh
code --install-extension kmartin26.pigeon-sync
```

**From Open VSX** (VSCodium, Cursor, Windsurf, Gitpod and other VS Code forks): search for **Pigeon** in the Extensions view, or get it on [open-vsx.org](https://open-vsx.org/extension/kmartin26/pigeon-sync). With VSCodium:

```sh
codium --install-extension kmartin26.pigeon-sync
```

**From a VSIX**: download the latest `.vsix` from the [releases page](https://github.com/kmartin26/pigeon-sync/releases), open the Extensions view, then "..." > **Install from VSIX...**.

### Coming from Natizyskunk or liximomo SFTP?

Uninstall `Natizyskunk.sftp` or `liximomo.sftp` first: they register the same `sftp.*` commands. Your `.vscode/sftp.json` files and commands are unchanged, so existing projects work as-is.

## Quick start

1. Open the local folder you want to sync. It can be empty if you start from the server.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **SFTP: Config**.
3. Fill in `.vscode/sftp.json` with your server details:

   ```json
   {
     "name": "My Server",
     "host": "example.com",
     "protocol": "sftp",
     "port": 22,
     "username": "username",
     "remotePath": "/var/www/project",
     "uploadOnSave": true
   }
   ```

   `password` is optional: Pigeon prompts for it when needed. Escape backslashes and other special characters with a backslash.

4. Run **SFTP: Download Project** to pull `remotePath` into your local folder, or **SFTP: Sync Local -> Remote** to push it.
5. Edit and save. With `uploadOnSave`, each save is uploaded.

Type `sftp` in the Command Palette to see every command, or right-click files in the Explorer. See the full list of [commands](docs/commands.md) and [configuration options](docs/configuration.md).

## Example configurations

### Simple

```json
{
  "host": "host",
  "username": "username",
  "remotePath": "/remote/workspace"
}
```

### Profiles

```json
{
  "username": "username",
  "password": "password",
  "remotePath": "/remote/workspace/a",
  "watcher": {
    "files": "dist/*.{js,css}",
    "autoUpload": false,
    "autoDelete": false
  },
  "profiles": {
    "dev": {
      "host": "dev-host",
      "remotePath": "/dev",
      "uploadOnSave": true
    },
    "prod": {
      "host": "prod-host",
      "remotePath": "/prod"
    }
  },
  "defaultProfile": "dev"
}
```

`context` and `watcher` are only available at root level. Run **SFTP: Set Profile** to switch profile.

### Multiple contexts

Each `context` must be different, and `name` is required in this mode.

```json
[
  {
    "name": "server1",
    "context": "project/build",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/build"
  },
  {
    "name": "server2",
    "context": "project/src",
    "host": "host",
    "username": "username",
    "password": "password",
    "remotePath": "/remote/project/src"
  }
]
```

### Connection hopping

Connect to a target server through one or more SSH proxies. Variable substitution does not work in a hop configuration.

**Single hop**: local -> hop -> target

```json
{
  "name": "target",
  "remotePath": "/path/in/target",

  // hop
  "host": "hopHost",
  "username": "hopUsername",
  "privateKeyPath": "/Users/localUser/.ssh/id_rsa", // <-- The key file is on the local machine.

  "hop": {
    // target
    "host": "targetHost",
    "username": "targetUsername",
    "privateKeyPath": "/Users/hopUser/.ssh/id_rsa", // <-- The key file is on the hop.
    // or
    "localPrivateKeyPath": "/Users/localUser/.ssh/target_rsa" // <-- The key file is on the local machine.
  }
}
```

**Multiple hops**: local -> hopa -> hopb -> target

```json
{
  "name": "target",
  "remotePath": "/path/in/target",

  // hopa
  "host": "hopAHost",
  "username": "hopAUsername",
  "privateKeyPath": "/Users/hopAUsername/.ssh/id_rsa", // <-- The key file is on the local machine.

  "hop": [
    // hopb
    {
      "host": "hopBHost",
      "username": "hopBUsername",
      "privateKeyPath": "/Users/hopaUser/.ssh/id_rsa" // <-- The key file is on hopa.
    },

    // target
    {
      "host": "targetHost",
      "username": "targetUsername",
      "privateKeyPath": "/Users/hopbUser/.ssh/id_rsa", // <-- The key file is on hopb.
      // or
      "localPrivateKeyPath": "/Users/localUser/.ssh/target_rsa" // <-- The key file is on the local machine.
    }
  ]
}
```

Use `localPrivateKeyPath` instead of `privateKeyPath` to read the key file from the local machine. It works in every hop entry and takes precedence over `privateKeyPath`.

`passphrase` applies only to the entry where it is set. A `hop` entry does not inherit the `passphrase` of the root config. If a key is encrypted and its entry has no `passphrase`, a dialog asks for it when connecting. To be explicit without storing the passphrase in clear text, set `passphrase` to `true`:

```json
{
  "host": "hopHost",
  "username": "hopUsername",
  "privateKeyPath": "/Users/localUser/.ssh/id_rsa",
  "passphrase": true, // <-- Only for the key of hopHost.

  "hop": {
    "host": "targetHost",
    "username": "targetUsername",
    "localPrivateKeyPath": "/Users/localUser/.ssh/target_rsa",
    "passphrase": true // <-- Only for the key of targetHost.
  }
}
```

### Configuration in user settings

Use `remote` to read the connection from [remote-fs](https://github.com/liximomo/vscode-remote-fs) settings.

In user settings:

```json
"remotefs.remote": {
  "dev": {
    "scheme": "sftp",
    "host": "host",
    "username": "username",
    "rootPath": "/path/to/somewhere"
  },
  "projectX": {
    "scheme": "sftp",
    "host": "host",
    "username": "username",
    "privateKeyPath": "/Users/xx/.ssh/id_rsa",
    "rootPath": "/home/foo/some/projectx"
  }
}
```

In `sftp.json`:

```json
{
  "remote": "dev",
  "remotePath": "/home/xx/",
  "uploadOnSave": false,
  "ignore": [".vscode", ".git", ".DS_Store"]
}
```

## Remote Explorer

![Remote Explorer preview](assets/showcase/remote-explorer.png)

Open the Remote Explorer from the **SFTP** view in the Activity Bar, or run **View: Show SFTP**.

- **View and edit**: the Remote Explorer opens a read-only view of a file. Run **SFTP: Edit in Local** to edit it.
- **Multiple select**: hold `Ctrl` or `Shift` to select several files and folders, then download or upload them at once.
- **Download buttons**: hover a file or folder to show its inline download button.
- **Refresh**: click the refresh button in the editor title bar, or run **SFTP: Refresh Active Remote File**, to reload an open remote file from the server.
- **Order**: set `remoteExplorer.order` in `sftp.json` to sort several Remote Explorer roots (default `0`).

```json
{
  "remoteExplorer": {
    "order": 1
  }
}
```

After you **delete** a file, refresh the parent folder manually if the explorer does not update.

## Debug

1. Open the settings (`File > Preferences > Settings`, or `Code > Settings` on macOS).
2. Set `sftp.debug` to `true` and reload VS Code.
3. Read the logs in `View > Output > sftp`.

## FAQ

See the [Frequently Asked Questions](FAQ.md).

## Contributing

Bug reports, feature requests and pull requests are welcome. Open an [issue](https://github.com/kmartin26/pigeon-sync/issues) or read the [contributing guide](CONTRIBUTING.md). Every report is read and handled as fast as possible.

## Credits

- [@liximomo](https://github.com/liximomo): original author of vscode-sftp.
- [@Natizyskunk](https://github.com/Natizyskunk) and contributors: maintained fork up to v1.16.4.

## License

[MIT](LICENSE)
