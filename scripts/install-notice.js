#!/usr/bin/env node
// phaneslight-plugin v3.7.2 install-notice
//
// SessionStart notice, once per install. Plain stdout reaches the model, not the user;
// the systemMessage JSON field is the only channel that reliably reaches the human.
//
// Ported from PowerShell at v3.7.1: this hook is registered for every platform the plugin
// installs on, and a `powershell -File` entry is not runnable on macOS or Linux. It carries
// no platform-specific logic of its own, so Node is simply the correct host for it, with no
// launcher in between. The marker filename is unchanged, so an install that was already
// welcomed by the PowerShell version is not welcomed a second time.

'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = '3.7.2';

try {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) process.exit(0);

  const marker = path.join(dataDir, '.welcomed-' + VERSION);
  if (fs.existsSync(marker)) process.exit(0);

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(marker, '', 'utf8');

  const msg = 'PhanesLight v' + VERSION + ' installed. Run /phaneslight:run to update Project Memory.';
  process.stdout.write(JSON.stringify({ systemMessage: msg }));
} catch (e) {
  // A notice is never worth failing a session start over.
}
process.exit(0);
