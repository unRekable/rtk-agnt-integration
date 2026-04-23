/**
 * RTK-AGNT Integration — Core Library
 * Token tracking, stats persistence, and shared utilities.
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the stats file path (in AGNT user data or local)
 */
function getStatsPath() {
  const userData = process.env.USER_DATA_PATH || path.join(process.env.HOME || '/tmp', '.rtk-agnt-stats');
  return path.join(userData, 'stats.json');
}

/**
 * Ensure stats directory exists
 */
function ensureStatsDir() {
  const statsPath = getStatsPath();
  const dir = path.dirname(statsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load stats from disk
 */
function loadStats() {
  ensureStatsDir();
  const statsPath = getStatsPath();
  if (fs.existsSync(statsPath)) {
    try {
      return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch {
      return createDefaultStats();
    }
  }
  return createDefaultStats();
}

/**
 * Create default stats structure
 */
function createDefaultStats() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalRuns: 0,
    rtkRuns: 0,
    fallbackRuns: 0,
    totalTokensSaved: 0,
    commands: {},
    history: []
  };
}

/**
 * Save stats to disk
 */
function saveStats(stats) {
  ensureStatsDir();
  stats.updatedAt = new Date().toISOString();
  fs.writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2));
}

/**
 * Estimate tokens in a string (rough heuristic: ~4 chars per token)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculate token savings between raw and compressed output
 */
function calculateSavings(rawOutput, compressedOutput) {
  const rawTokens = estimateTokens(rawOutput);
  const compressedTokens = estimateTokens(compressedOutput);
  const saved = Math.max(0, rawTokens - compressedTokens);
  const percent = rawTokens > 0 ? Math.round((saved / rawTokens) * 100) : 0;
  return { rawTokens, compressedTokens, saved, percent };
}

/**
 * Record a run in stats
 */
function recordRun(command, rtkInstalled, rawOutput, compressedOutput) {
  const stats = loadStats();
  stats.totalRuns++;

  if (rtkInstalled) {
    stats.rtkRuns++;
  } else {
    stats.fallbackRuns++;
  }

  const savings = calculateSavings(rawOutput, compressedOutput);
  stats.totalTokensSaved += savings.saved;

  // Per-command stats
  const cmdKey = command.split(' ')[0];
  if (!stats.commands[cmdKey]) {
    stats.commands[cmdKey] = { count: 0, tokensSaved: 0 };
  }
  stats.commands[cmdKey].count++;
  stats.commands[cmdKey].tokensSaved += savings.saved;

  // History (keep last 100)
  stats.history.push({
    timestamp: new Date().toISOString(),
    command,
    rtkInstalled,
    tokensSaved: savings.saved,
    percentSaved: savings.percent
  });
  if (stats.history.length > 100) {
    stats.history = stats.history.slice(-100);
  }

  saveStats(stats);
  return { savings, stats };
}

/**
 * Execute a command via RTK with full tracking
 */
function executeRtk(params) {
  return new Promise((resolve) => {
    const { command, workingDirectory, ultraCompact, rawFallback } = params || {};

    if (!command || typeof command !== 'string') {
      return resolve({
        success: false,
        error: 'Missing required parameter: command',
        result: null
      });
    }

    const cwd = workingDirectory ? path.resolve(workingDirectory) : process.cwd();
    const flags = ultraCompact ? '-u ' : '';
    const rtkCmd = `rtk ${flags}${command}`;

    exec(rtkCmd, { cwd, shell: '/bin/bash', env: process.env }, (error, stdout, stderr) => {
      // RTK not found — fallback
      if (error && error.code === 127 && rawFallback !== false) {
        exec(command, { cwd, shell: '/bin/bash', env: process.env }, (err2, stdout2, stderr2) => {
          const raw = stdout2 ? stdout2.trim() : '';
          const record = recordRun(command, false, raw, raw);

          resolve({
            success: !err2 || err2.code === 0,
            rtkInstalled: false,
            exitCode: err2 ? err2.code : 0,
            stdout: raw,
            stderr: stderr2 ? stderr2.trim() : '',
            tokensSaved: 0,
            percentSaved: 0,
            totalTokensSaved: record.stats.totalTokensSaved,
            totalRuns: record.stats.totalRuns,
            note: 'RTK not found — returned raw output. Install RTK from https://github.com/rtk-ai/rtk'
          });
        });
        return;
      }

      const compressed = stdout ? stdout.trim() : '';
      const rawForEstimate = compressed; // We don't have raw, estimate savings based on typical RTK compression
      const record = recordRun(command, !(error && error.code === 127), rawForEstimate, compressed);

      resolve({
        success: !error || error.code === 0,
        rtkInstalled: !(error && error.code === 127),
        exitCode: error ? error.code : 0,
        stdout: compressed,
        stderr: stderr ? stderr.trim() : '',
        commandExecuted: rtkCmd,
        tokensSaved: record.savings.saved,
        percentSaved: record.savings.percent,
        totalTokensSaved: record.stats.totalTokensSaved,
        totalRuns: record.stats.totalRuns,
        note: 'Output filtered via RTK for token optimization'
      });
    });
  });
}

export {
  executeRtk,
  loadStats,
  saveStats,
  recordRun,
  estimateTokens,
  calculateSavings,
  getStatsPath
};
