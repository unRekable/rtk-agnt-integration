#!/usr/bin/env node
/**
 * Build AGNT plugin package (.agnt file)
 * Usage: node bin/build-plugin.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_NAME = 'rtk-agnt-integration';
const OUTPUT_FILE = `${PLUGIN_NAME}.agnt`;

function buildPlugin() {
  const pluginDir = path.join(process.cwd(), 'plugin');

  if (!fs.existsSync(pluginDir)) {
    console.error('❌ Plugin directory not found: ./plugin');
    process.exit(1);
  }

  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found in plugin directory');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const bundle = {
    manifest,
    files: {}
  };

  const files = fs.readdirSync(pluginDir);
  for (const file of files) {
    const filePath = path.join(pluginDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      bundle.files[file] = fs.readFileSync(filePath, 'utf8');
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bundle, null, 2));
  console.log(`✅ Built plugin: ${OUTPUT_FILE}`);
  console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
}

buildPlugin();
