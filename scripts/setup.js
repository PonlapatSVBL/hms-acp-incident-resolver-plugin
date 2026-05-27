#!/usr/bin/env node
// Runs on every SessionStart via plugin.json hook.
// Clones and builds hms-acp-incident-mcp into CLAUDE_PLUGIN_DATA/server
// if the built server isn't already there. Idempotent — safe to run repeatedly.

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const REPO_URL = 'https://github.com/PonlapatSVBL/hms-acp-incident-mcp';

const pluginData = process.env.CLAUDE_PLUGIN_DATA;
if (!pluginData) {
  console.log('[hms-acp] CLAUDE_PLUGIN_DATA not set — skipping auto-setup.');
  console.log('[hms-acp] Set HMS_ACP_INCIDENT_MCP_HOME manually and point .mcp.json to it.');
  process.exit(0);
}

const serverDir = join(pluginData, 'server');
const builtIndex = join(serverDir, 'dist', 'index.js');

if (existsSync(builtIndex)) {
  process.exit(0);
}

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

try {
  if (!existsSync(join(serverDir, 'package.json'))) {
    console.log('[hms-acp] Cloning hms-acp-incident-mcp...');
    run(`git clone --depth 1 ${REPO_URL} "${serverDir}"`);
  }

  console.log('[hms-acp] Installing dependencies...');
  run('npm install', serverDir);

  console.log('[hms-acp] Building...');
  run('npm run build', serverDir);

  console.log('[hms-acp] MCP server ready:', builtIndex);
} catch (err) {
  console.error('[hms-acp] Setup failed:', err.message);
  console.error('[hms-acp] Fix the error above, then restart Claude Code to retry.');
  process.exit(1);
}
