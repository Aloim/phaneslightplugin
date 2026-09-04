#!/usr/bin/env node
// phaneslight-plugin v3.7.1 hook-run
//
// Cross-platform launcher for the three project-installed PhanesLight hook scripts.
//
// Why this exists. Until v3.7.0 the run merged hook entries into each project's own
// .claude/settings.json, so it could write a PowerShell entry on Windows and a shell entry
// on POSIX, and omit an entry outright where no variant of that hook exists. v3.7.0 moved
// registration into the plugin's hooks/hooks.json, which is one static file shipped to every
// platform, and the per-platform choice had nowhere left to live. The entries were therefore
// PowerShell on macOS and Linux too, pointing at .ps1 files a POSIX install never writes.
//
// Node is the one interpreter guaranteed present (Claude Code is itself a Node program), and
// `node <file>` parses identically in cmd, PowerShell and sh, so the dispatch decision moves
// here. Windows runs the .ps1, POSIX runs the .sh, and a hook whose platform variant does not
// exist is a silent no-op rather than a broken command. That last case is not hypothetical:
// hook-ledger-status has no POSIX sibling yet, and skipping it is what the spec already
// prescribed back when settings.json could simply omit the entry.
//
// Exit codes from the hook script itself pass through UNCHANGED. hook-stamp-guard is a
// blocking PreToolUse hook whose non-zero exit is the block, so swallowing it would disarm
// the guard. Only failures of this launcher degrade to 0, with one line on stderr.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const name = process.argv[2];
if (!name || !/^[A-Za-z0-9._-]+$/.test(name)) {
  process.stderr.write('phaneslight hook-run: expected a hook script name\n');
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const isWindows = process.platform === 'win32';
const file = path.join(projectDir, '.phaneslight', 'scripts', name + (isWindows ? '.ps1' : '.sh'));

// No script on disk means either this platform has no variant of the hook, or PhanesLight is
// not installed in this project at all. Both are ordinary states, not errors.
let present = false;
try {
  present = fs.statSync(file).isFile();
} catch (e) {
  present = false;
}
if (!present) process.exit(0);

const cmd = isWindows ? 'powershell' : 'sh';
const args = isWindows
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file]
  : [file];

// stdio inherit hands the hook script the harness's own stdin, which is where the hook JSON
// payload arrives, and its stdout, which is the channel back to the session. Buffering either
// would break scripts that read the payload to decide.
const r = spawnSync(cmd, args, { stdio: 'inherit', windowsHide: true });

if (r.error) {
  process.stderr.write('phaneslight hook-run: could not start ' + cmd + ' for ' + name + ': ' + r.error.message + '\n');
  process.exit(0);
}
if (typeof r.status === 'number') process.exit(r.status);
process.exit(0);
