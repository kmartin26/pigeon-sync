# Pigeon - SFTP/FTP Sync for VS Code

Actively maintained fork of [Natizyskunk's SFTP extension](https://github.com/Natizyskunk/vscode-sftp), itself forked from [liximomo's SFTP plugin](https://github.com/liximomo/vscode-sftp). This fork keeps the extension working on current VS Code and Node versions and continues to evolve it.

Upstream's last feature release was 1.16.3 (June 2023). Version 1.16.4 (October 2026) merged long-pending pull requests but still crashes on recent VS Code/Node versions (`util.isDate` removal in `ssh2`). This fork fixes it starting with 1.16.5.

- Marketplace: https://marketplace.visualstudio.com/items?itemName=kmartin26.pigeon-sync (`code --install-extension kmartin26.pigeon-sync`)
- VSIX release : https://github.com/kmartin26/pigeon-sync/releases/

If `Natizyskunk.sftp` or `liximomo.sftp` is installed, uninstall it first: both register the same `sftp.*` commands.

Configuration (`.vscode/sftp.json`) and commands are unchanged, so existing projects work as-is.

Bug reports, feature requests and pull requests are welcome: https://github.com/kmartin26/pigeon-sync/issues. Every report is read and handled as fast as possible.

---

Pigeon enables you to add, edit or delete files within a local directory and have it sync to a remote server directory using different transfer protocols like FTP or SSH. The most basic setup requires only a few lines of configuration with a wide array of specific settings also available to meet the needs of any user. Both powerful and fast, it helps developers save time by allowing the use of a familiar editor and environment.

- Features
  - [Browser remote with Remote Explorer](#remote-explorer)
  - Diff local and remote
  - Sync directory
  - Upload/Download
  - Upload on save
  - File Watcher
  - Multiple configurations
  - Switchable profiles
  - Temp File support
- [Commands](docs/commands.md)
- [Debug](#debug)
- [FAQ](#FAQ)

## Installation

### From VSIX
1. Download the latest `.vsix` from the [releases page](https://github.com/kmartin26/pigeon-sync/releases/).
2. Select Extensions (Ctrl + Shift + X).
3. Uninstall any other sftp extension (@liximomo or @Natizyskunk): they register the same commands.
4. Open "More Action" menu (ellipsis on the top) and click "Install from VSIX…".
5. Locate the VSIX file and select it.
6. Reload VS Code.

## Documentation
- [Home](docs/home.md)
- [Settings](docs/setting.md)
- [Common configuration](docs/common_configuration.md)
- [SFTP configuration](docs/sftp_configuration.md)
- [FTP configuration](docs/ftp_configuration.md)
- [Commands](docs/commands.md)

## Usage
If the latest files are already on a remote server, you can start with an empty local folder,
then download your project, and from that point sync.

1. In `VS Code`, open a local directory you wish to sync to the remote server (or create an empty directory
that you wish to first download the contents of a remote server folder in order to edit locally).
2. `Ctrl+Shift+P` on Windows/Linux or `Cmd+Shift+P` on Mac open command palette, run `SFTP: config` command.
3. A basic configuration file will appear named `sftp.json` under the `.vscode` directory, open and edit the configuration parameters with your remote server information.

For instance:
```json
{
    "name": "Profile Name",
    "host": "name_of_remote_host",
    "protocol": "ftp",
    "port": 21,
    "secure": true,
    "username": "username",
    "remotePath": "/public_html/project", // <--- This is the path which will be downloaded if you "Download Project"
    "password": "password",
    "uploadOnSave": false
}
```
The password parameter in `sftp.json` is optional, if left out you will be prompted for a password on sync.
_Note：_ backslashes and other special characters must be escaped with a backslash.

4. Save and close the `sftp.json` file.
5. `Ctrl+Shift+P` on Windows/Linux or `Cmd+Shift+P` on Mac open command palette.
6. Type `sftp` and you'll now see a number of other commands. You can also access many of the commands from the project's file explorer context menus.
7. A good one to start with if you want to sync with a remote folder is `SFTP: Download Project`.  This will download the directory shown in the `remotePath` setting in `sftp.json` to your local open directory.
8. Done - you can now edit locally and after each save it will upload to sync your remote file with the local copy.
9. Enjoy!

For detailed explanations see the [documentation](docs/home.md).

## Example configurations
You can see the full list of configuration options [here](docs/configuration.md).

- [Pigeon - SFTP/FTP Sync for VS Code](#pigeon---sftpftp-sync-for-vs-code)
  - [Installation](#installation)
    - [From VSIX](#from-vsix)
  - [Documentation](#documentation)
  - [Usage](#usage)
  - [Example configurations](#example-configurations)
    - [Simple](#simple)
    - [Profiles](#profiles)
    - [Multiple Context](#multiple-context)
    - [Connection Hopping](#connection-hopping)
      - [Single Hop](#single-hop)
      - [Multiple Hop](#multiple-hop)
    - [Configuration in User Setting](#configuration-in-user-setting)
  - [Remote Explorer](#remote-explorer)
    - [Multiple Select](#multiple-select)
    - [Order](#order)
  - [Debug](#debug)
  - [FAQ](#faq)
  - [Credits](#credits)

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

_Note：_ `context` and `watcher` are only available at root level.

Use `SFTP: Set Profile` to switch profile.

### Multiple Context
The context must **not be same**.
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

_Note：_ `name` is required in this mode.

### Connection Hopping
You can connect to a target server through a proxy with ssh protocol.

_Note：_ Variable substitution is not working in a hop configuration.

#### Single Hop
local -> hop -> target
```json
{
  "name": "target",
  "remotePath": "/path/in/target",

  // hop
  "host": "hopHost",
  "username": "hopUsername",
  "privateKeyPath": "/Users/localUser/.ssh/id_rsa", // <-- The key file is assumed on the local.

  "hop": {
    // target
    "host": "targetHost",
    "username": "targetUsername",
    "privateKeyPath": "/Users/hopUser/.ssh/id_rsa", // <-- The key file is assumed on the hop.
    // or
    "localPrivateKeyPath": "/Users/localUser/.ssh/target_rsa", // <-- The key file is on the local machine.
  }
}
```

_Note：_ Use `localPrivateKeyPath` instead of `privateKeyPath` to read the key file from the local machine. It works in every hop entry and takes precedence over `privateKeyPath`.

#### Multiple Hop
local -> hopa -> hopb -> target
```json
{
  "name": "target",
  "remotePath": "/path/in/target",

  // hopa
  "host": "hopAHost",
  "username": "hopAUsername",
  "privateKeyPath": "/Users/hopAUsername/.ssh/id_rsa" // <-- The key file is assumed on the local.

  "hop": [
    // hopb
    {
      "host": "hopBHost",
      "username": "hopBUsername",
      "privateKeyPath": "/Users/hopaUser/.ssh/id_rsa" // <-- The key file is assumed on the hopa.
    },

    // target
    {
      "host": "targetHost",
      "username": "targetUsername",
      "privateKeyPath": "/Users/hopbUser/.ssh/id_rsa", // <-- The key file is assumed on the hopb.
      // or
      "localPrivateKeyPath": "/Users/localUser/.ssh/target_rsa", // <-- The key file is on the local machine.
    }
  ]
}
```

### Configuration in User Setting
You can use `remote` to tell sftp to get the configuration from [remote-fs](https://github.com/liximomo/vscode-remote-fs).

In User Setting:
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

In sftp.json:
```json
{
  "remote": "dev",
  "remotePath": "/home/xx/",
  "uploadOnSave": false,
  "ignore": [".vscode", ".git", ".DS_Store"]
}
```

## Remote Explorer
![remote-explorer-preview](https://raw.githubusercontent.com/kmartin26/pigeon-sync/main/assets/showcase/remote-explorer.png)

Remote Explorer lets you explore files in remote. You can open Remote Explorer by:

1. Run Command `View: Show SFTP`.
2. Click SFTP view in Activity Bar.

You can only view a files content with Remote Explorer. Run command `SFTP: Edit in Local` to edit it in local.

### Multiple Select
You are able to select multiple files/folders at once on the remote server to download and upload. You can do it simply by holding down Ctrl or Shift while selecting all desired files, just like on the regular explorer view.

_Note：_ You need to manually refresh the parent folder after you **delete** a file if the explorer isn't correctly updated.

### Download buttons
Files and folders in the Remote Explorer have an inline download button, shown when hovering an item, to quickly run `Download File` or `Download Folder`.

### Refresh Active Remote File
When a remote file is open in the editor, click the refresh button in the editor title bar (or run `SFTP: Refresh Active Remote File`) to reload its content from the server.

### Order
You can order the remote Explorer by adding the `remoteExplorer.order` parameter inside your `sftp.json` config file.

In sftp.json:
```json
{
  "remoteExplorer": {
    "order": 1 // <-- Default value is 0.
  }
}
```

## Debug
1. Open User Settings.
  - On Windows/Linux - `File > Preferences > Settings`
  - On macOS - `Code > Preferences > Settings`
2. Set `sftp.debug` to `true` and reload vscode.
3. View the logs in `View > Output > sftp`.

## FAQ
You can see all the Frequently Asked Questions [here](./FAQ.md).

## Credits
- [@liximomo](https://github.com/liximomo): original author of vscode-sftp.
- [@Natizyskunk](https://github.com/Natizyskunk) and contributors: maintained fork up to v1.16.4.
