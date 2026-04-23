#!/usr/bin/env node
/**
 * Lightweight ESM test runner — validates all V3 logic without external deps.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '..', '.test-stats');
process.env.USER_DATA_PATH = TEST_DIR;

// Simple assertion helpers
const assert = {
  strictEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  },
  ok(value, msg) {
    if (!value) throw new Error(msg || 'Expected truthy value');
  },
  deepEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${msg || 'Deep equal failed'}:\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  }
};

// Test registry
const tests = [];
function describe(name, fn) { tests.push({ name, fn }); }

// Clean test dir before each test
function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

console.log('\n🧪 RTK-AGNT V3 Test Suite\n');

// === TEST SUITES ===

describe('Token Estimation', async () => {
  const { estimateTokens } = await import('../src/index.js');
  
  assert.strictEqual(estimateTokens(''), 0, 'empty string');
  assert.strictEqual(estimateTokens(null), 0, 'null');
  assert.strictEqual(estimateTokens('abcd'), 1, '4 chars = 1 token');
  assert.strictEqual(estimateTokens('abcdefghijklmnop'), 4, '16 chars = 4 tokens');
});

describe('Savings Calculation', async () => {
  const { calculateSavings } = await import('../src/index.js');
  
  const r1 = calculateSavings('hello world', 'hello world');
  assert.strictEqual(r1.saved, 0, 'identical output saves 0');
  
  const raw = 'a'.repeat(1000);
  const compressed = 'a'.repeat(200);
  const r2 = calculateSavings(raw, compressed);
  assert.ok(r2.saved > 0, 'compression saves tokens');
  assert.strictEqual(r2.percent, 80, '80% saved');
});

describe('Stats Persistence', async () => {
  const { loadStats, saveStats, recordRun, getStatsPath } = await import('../src/index.js');
  
  cleanTestDir();
  
  // Default stats
  const s1 = loadStats();
  assert.strictEqual(s1.version, 1, 'default version');
  assert.strictEqual(s1.totalRuns, 0, 'default runs');
  
  // Save and reload
  s1.totalRuns = 5;
  saveStats(s1);
  const s2 = loadStats();
  assert.strictEqual(s2.totalRuns, 5, 'persisted correctly');
  
  // Record run
  cleanTestDir();
  const r1 = recordRun('git status', true, 'raw', 'compressed');
  assert.strictEqual(r1.stats.totalRuns, 1, 'run recorded');
  assert.strictEqual(r1.stats.rtkRuns, 1, 'rtk run counted');
  assert.ok(r1.stats.commands.git, 'command tracked');
  
  // Record fallback
  const r2 = recordRun('ls', false, 'output', 'output');
  assert.strictEqual(r2.stats.fallbackRuns, 1, 'fallback counted');
  
  // History limit
  cleanTestDir();
  for (let i = 0; i < 105; i++) {
    recordRun(`cmd${i}`, true, 'raw', 'comp');
  }
  const s3 = loadStats();
  assert.strictEqual(s3.history.length, 100, 'history capped at 100');
  assert.strictEqual(s3.totalRuns, 105, 'total runs correct');
});

describe('RtkRunner Plugin', async () => {
  const RtkRunner = (await import('../plugin/rtk-runner.js')).default;
  
  assert.strictEqual(RtkRunner.name, 'rtk-runner', 'tool name matches manifest');
  assert.strictEqual(typeof RtkRunner.execute, 'function', 'execute is a function');
  
  // Missing command
  const r1 = await RtkRunner.execute({});
  assert.strictEqual(r1.success, false, 'fails without command');
  assert.strictEqual(r1.error, 'Missing required parameter: command');
  
  // Invalid command type
  const r2 = await RtkRunner.execute({ command: 123 });
  assert.strictEqual(r2.success, false, 'fails with non-string command');
});

describe('RtkStats Plugin', async () => {
  const RtkStats = (await import('../plugin/rtk-stats.js')).default;
  
  cleanTestDir();
  
  const r1 = await RtkStats.execute({ period: 'all' });
  assert.strictEqual(r1.success, true, 'returns success');
  assert.strictEqual(r1.totalRuns, 0, 'empty stats');
  
  // Add data and filter
  const { recordRun } = await import('../src/index.js');
  recordRun('git status', true, 'a', 'b');
  
  const r2 = await RtkStats.execute({ period: 'today' });
  assert.strictEqual(r2.totalRuns, 1, 'filters today correctly');
});

describe('RtkDashboard Plugin', async () => {
  const RtkDashboard = (await import('../plugin/rtk-dashboard.js')).default;
  
  cleanTestDir();
  
  const r1 = await RtkDashboard.execute();
  assert.strictEqual(r1.success, true, 'returns success');
  assert.ok(r1.html.includes('<!DOCTYPE html>'), 'returns HTML');
  assert.ok(r1.html.includes('RTK Token Optimizer'), 'contains title');
  
  // Theme-aware
  assert.ok(r1.html.includes('--color-bg'), 'uses CSS variables for theming');
  assert.ok(r1.html.includes('--color-accent'), 'uses accent variables');
});

// === RUNNER ===
let passed = 0, failed = 0;

for (const suite of tests) {
  try {
    cleanTestDir();
    await suite.fn();
    console.log(`  ✅ ${suite.name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${suite.name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total\n`);

if (failed > 0) process.exit(1);
