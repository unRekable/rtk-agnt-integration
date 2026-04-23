#!/usr/bin/env node
/**
 * Install RTK plugin into local AGNT instance
 * Usage: node bin/install-to-agnt.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_NAME = 'rtk-agnt-integration';
const AGNT_PLUGINS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.agnt',
  'data',
  'plugins'
);

function findProjectRoot() {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function copyPluginFiles() {
  const projectRoot = findProjectRoot();
  const pluginSrc = path.join(projectRoot, 'plugin');
  const pluginDest = path.join(AGNT_PLUGINS_DIR, PLUGIN_NAME);

  ensureDir(pluginDest);

  const files = fs.readdirSync(pluginSrc);
  for (const file of files) {
    const src = path.join(pluginSrc, file);
    const dest = path.join(pluginDest, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} → ${dest}`);
    }
  }

  return pluginDest;
}

function checkRtkInstalled() {
  try {
    execSync('rtk --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log('🔧 RTK-AGNT Integration Installer\n');

  if (!checkRtkInstalled()) {
    console.warn('⚠️  WARNING: RTK is not installed or not in PATH.');
    console.warn('   The plugin will still work in raw fallback mode.');
    console.warn('   Install RTK: https://github.com/rtk-ai/rtk\n');
  } else {
    console.log('✅ RTK detected on system\n');
  }

  console.log(`Installing plugin to: ${AGNT_PLUGINS_DIR}`);
  const dest = copyPluginFiles();
  console.log(`\n✅ Plugin installed to: ${dest}`);
  console.log('   Restart AGNT or hot-reload plugins to activate.');
}

main();
