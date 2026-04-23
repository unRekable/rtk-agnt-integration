import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  estimateTokens,
  calculateSavings,
  getStatsPath,
  loadStats,
  saveStats,
  recordRun
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_STATS_DIR = path.join(__dirname, '..', '.test-stats');

describe('Token Estimation', () => {
  test('estimateTokens returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test('estimateTokens calculates roughly 4 chars per token', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefghijklmnop')).toBe(4);
  });
});

describe('Savings Calculation', () => {
  test('calculateSavings with identical output', () => {
    const result = calculateSavings('hello world', 'hello world');
    expect(result.saved).toBe(0);
    expect(result.percent).toBe(0);
  });

  test('calculateSavings with shorter compressed output', () => {
    const raw = 'a'.repeat(1000);
    const compressed = 'a'.repeat(200);
    const result = calculateSavings(raw, compressed);
    expect(result.saved).toBe(200); // (1000-200)/4 = 200 tokens
    expect(result.percent).toBe(80);
  });

  test('calculateSavings handles zero raw', () => {
    const result = calculateSavings('', 'test');
    expect(result.saved).toBe(0);
    expect(result.percent).toBe(0);
  });
});

describe('Stats Persistence', () => {
  beforeEach(() => {
    process.env.USER_DATA_PATH = TEST_STATS_DIR;
    const statsPath = getStatsPath();
    if (fs.existsSync(statsPath)) {
      fs.unlinkSync(statsPath);
    }
  });

  afterEach(() => {
    delete process.env.USER_DATA_PATH;
    if (fs.existsSync(TEST_STATS_DIR)) {
      fs.rmSync(TEST_STATS_DIR, { recursive: true, force: true });
    }
  });

  test('loadStats creates default when missing', () => {
    const stats = loadStats();
    expect(stats.version).toBe(1);
    expect(stats.totalRuns).toBe(0);
    expect(stats.totalTokensSaved).toBe(0);
  });

  test('saveStats writes to disk', () => {
    const stats = loadStats();
    stats.totalRuns = 5;
    saveStats(stats);

    const loaded = loadStats();
    expect(loaded.totalRuns).toBe(5);
  });

  test('recordRun increments counters', () => {
    const result = recordRun('git status', true, 'raw output', 'compressed');
    expect(result.stats.totalRuns).toBe(1);
    expect(result.stats.rtkRuns).toBe(1);
    expect(result.stats.commands.git).toBeDefined();
  });

  test('recordRun tracks fallback separately', () => {
    recordRun('ls', false, 'output', 'output');
    const stats = loadStats();
    expect(stats.fallbackRuns).toBe(1);
    expect(stats.rtkRuns).toBe(0);
  });

  test('recordRun limits history to 100 entries', () => {
    for (let i = 0; i < 105; i++) {
      recordRun(`cmd${i}`, true, 'raw', 'compressed');
    }
    const stats = loadStats();
    expect(stats.history.length).toBe(100);
    expect(stats.totalRuns).toBe(105);
  });

  test('recordRun aggregates per-command stats', () => {
    recordRun('git status', true, 'a'.repeat(100), 'b');
    recordRun('git log', true, 'c'.repeat(100), 'd');
    recordRun('git status', true, 'e'.repeat(100), 'f');

    const stats = loadStats();
    expect(stats.commands.git.count).toBe(3);
    expect(stats.commands.git.tokensSaved).toBeGreaterThan(0);
  });
});
