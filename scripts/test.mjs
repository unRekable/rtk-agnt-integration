#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, '..', '.test-stats');
process.env.USER_DATA_PATH = TEST_DIR;

const assert = {
  strictEqual(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  },
  ok(value, msg) {
    if (!value) throw new Error(msg || 'Expected truthy value');
  }
};

const tests = [];
function describe(name, fn) { tests.push({ name, fn }); }

function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

console.log('\n🧪 RTK-AGNT V3 Test Suite\n');

describe('Token Estimation', async () => {
  const { estimateTokens } = await import('../src/index.js');
  assert.strictEqual(estimateTokens(''), 0, 'empty string');
  assert.strictEqual(estimateTokens('abcd'), 1, '4 chars = 1 token');
});

describe('Savings Calculation', async () => {
  const { calculateSavings } = await import('../src/index.js');
  const r1 = calculateSavings('hello world', 'hello world');
  assert.strictEqual(r1.saved, 0, 'identical output saves 0');
});

describe('Stats Persistence', async () => {
  const { loadStats, saveStats, recordRun } = await import('../src/index.js');
  cleanTestDir();
  const s1 = loadStats();
  assert.strictEqual(s1.version, 1, 'default version');
  s1.totalRuns = 5;
  saveStats(s1);
  const s2 = loadStats();
  assert.strictEqual(s2.totalRuns, 5, 'persisted correctly');
  cleanTestDir();
  const r1 = recordRun('git status', true, 'raw', 'compressed');
  assert.strictEqual(r1.stats.totalRuns, 1, 'run recorded');
});

describe('RtkRunner Plugin', async () => {
  const RtkRunner = (await import('../plugin/rtk-runner.js')).default;
  assert.strictEqual(RtkRunner.name, 'rtk-runner', 'tool name matches manifest');
  const r1 = await RtkRunner.execute({});
  assert.strictEqual(r1.success, false, 'fails without command');
});

describe('RtkStats Plugin', async () => {
  const RtkStats = (await import('../plugin/rtk-stats.js')).default;
  cleanTestDir();
  const r1 = await RtkStats.execute({ period: 'all' });
  assert.strictEqual(r1.success, true, 'returns success');
});

describe('RtkDashboard Plugin', async () => {
  const RtkDashboard = (await import('../plugin/rtk-dashboard.js')).default;
  cleanTestDir();
  const r1 = await RtkDashboard.execute();
  assert.strictEqual(r1.success, true, 'returns success');
  assert.ok(r1.html.includes('<!DOCTYPE html>'), 'returns HTML');
  assert.ok(r1.html.includes('--color-bg'), 'uses CSS variables for theming');
});

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
