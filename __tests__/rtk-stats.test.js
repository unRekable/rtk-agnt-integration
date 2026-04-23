import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RtkStats from '../plugin/rtk-stats.js';
import { saveStats, loadStats } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_STATS_DIR = path.join(__dirname, '..', '.test-stats');

describe('RtkStats Tool', () => {
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

  test('returns empty stats when no data', async () => {
    const result = await RtkStats.execute({ period: 'all' });
    expect(result.success).toBe(true);
    expect(result.totalRuns).toBe(0);
    expect(result.totalTokensSaved).toBe(0);
  });

  test('filters by today', async () => {
    // Add a run now
    const stats = loadStats();
    stats.history = [
      { timestamp: new Date().toISOString(), command: 'git status', rtkInstalled: true, tokensSaved: 100 },
      { timestamp: new Date(Date.now() - 86400000).toISOString(), command: 'ls', rtkInstalled: false, tokensSaved: 0 }
    ];
    stats.totalRuns = 2;
    saveStats(stats);

    const result = await RtkStats.execute({ period: 'today' });
    expect(result.totalRuns).toBe(1);
    expect(result.history[0].command).toBe('git status');
  });

  test('filters by week', async () => {
    const stats = loadStats();
    stats.history = [
      { timestamp: new Date().toISOString(), command: 'now', tokensSaved: 50 },
      { timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), command: 'old', tokensSaved: 20 }
    ];
    stats.totalRuns = 2;
    saveStats(stats);

    const result = await RtkStats.execute({ period: 'week' });
    expect(result.totalRuns).toBe(1);
  });

  test('handles errors gracefully', async () => {
    // Force an error by breaking the stats file
    fs.writeFileSync(path.join(TEST_STATS_DIR, 'stats.json'), 'invalid json');
    const result = await RtkStats.execute({ period: 'all' });
    expect(result.success).toBe(true); // Should recover with defaults
  });
});
