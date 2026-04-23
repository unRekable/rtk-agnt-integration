import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RtkDashboard from '../plugin/rtk-dashboard.js';
import { saveStats, loadStats } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_STATS_DIR = path.join(__dirname, '..', '.test-stats');

describe('RtkDashboard Tool', () => {
  beforeEach(() => {
    process.env.USER_DATA_PATH = TEST_STATS_DIR;
    const statsPath = path.join(TEST_STATS_DIR, 'stats.json');
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

  test('returns HTML dashboard', async () => {
    const result = await RtkDashboard.execute();
    expect(result.success).toBe(true);
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('RTK Token Optimizer');
  });

  test('dashboard contains stats data', async () => {
    const stats = loadStats();
    stats.totalRuns = 42;
    stats.totalTokensSaved = 15000;
    stats.rtkRuns = 40;
    stats.fallbackRuns = 2;
    saveStats(stats);

    const result = await RtkDashboard.execute();
    expect(result.html).toContain('42');
    expect(result.html).toContain('15,000');
    expect(result.html).toContain('40');
  });

  test('dashboard includes command chart when data exists', async () => {
    const stats = loadStats();
    stats.commands = {
      git: { count: 10, tokensSaved: 5000 },
      docker: { count: 5, tokensSaved: 2000 }
    };
    saveStats(stats);

    const result = await RtkDashboard.execute();
    expect(result.html).toContain('git');
    expect(result.html).toContain('docker');
    expect(result.html).toContain('bar-chart');
  });

  test('dashboard is theme-aware with CSS variables', async () => {
    const result = await RtkDashboard.execute();
    expect(result.html).toContain('--color-bg');
    expect(result.html).toContain('--color-accent');
    expect(result.html).toContain('var(--color-bg');
  });

  test('handles empty data gracefully', async () => {
    const result = await RtkDashboard.execute();
    expect(result.success).toBe(true);
    expect(result.html).toContain('0');
  });
});
