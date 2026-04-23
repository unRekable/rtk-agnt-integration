import { loadStats } from '../src/index.js';

/**
 * AGNT Plugin Tool: RTK Dashboard
 * Interactive token savings dashboard — theme-aware, responsive, self-contained HTML.
 */
class RtkDashboard {
  constructor() {
    this.name = 'rtk-dashboard';
  }

  async execute() {
    try {
      const stats = loadStats();

      // Calculate derived metrics
      const totalRuns = stats.totalRuns || 0;
      const rtkRuns = stats.rtkRuns || 0;
      const fallbackRuns = stats.fallbackRuns || 0;
      const totalTokensSaved = stats.totalTokensSaved || 0;
      const rtkRate = totalRuns > 0 ? Math.round((rtkRuns / totalRuns) * 100) : 0;

      // Command breakdown for chart
      const commandEntries = Object.entries(stats.commands || {})
        .sort((a, b) => b[1].tokensSaved - a[1].tokensSaved)
        .slice(0, 6);

      const commandLabels = commandEntries.map(([cmd]) => cmd);
      const commandSavings = commandEntries.map(([, data]) => data.tokensSaved);
      const commandCounts = commandEntries.map(([, data]) => data.count);

      // History sparkline (last 20 runs)
      const recentHistory = (stats.history || []).slice(-20);
      const sparkData = recentHistory.map(h => h.tokensSaved || 0);

      const html = this._renderDashboard({
        totalRuns,
        rtkRuns,
        fallbackRuns,
        totalTokensSaved,
        rtkRate,
        commandLabels,
        commandSavings,
        commandCounts,
        sparkData,
        recentHistory
      });

      return { success: true, html };
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return { error: error.message, success: false };
    }
  }

  _renderDashboard(data) {
    const {
      totalRuns, rtkRuns, fallbackRuns, totalTokensSaved,
      rtkRate, commandLabels, commandSavings, sparkData
    } = data;

    const sparkPoints = sparkData.length > 0
      ? sparkData.map((v, i) => `${i * (300 / Math.max(sparkData.length - 1, 1))},${60 - (v / Math.max(...sparkData, 1)) * 50}`).join(' ')
      : '';

    const barMax = Math.max(...commandSavings, 1);
    const bars = commandLabels.map((label, i) => {
      const height = (commandSavings[i] / barMax) * 100;
      return `<div class="bar" style="--h:${height}%" data-label="${label}" data-val="${commandSavings[i]}"></div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
:root {
  --bg: var(--color-bg, #1a1a2e);
  --surface: var(--color-surface, #16213e);
  --text: var(--color-text, #e0e0e0);
  --text-secondary: var(--color-text-secondary, #a0a0b0);
  --accent: var(--color-accent, #e53d8f);
  --accent-2: var(--color-accent-2, #12e0ff);
  --accent-3: var(--color-accent-3, #19ef83);
  --border: var(--color-border, rgba(255,255,255,0.08));
  --radius: 12px;
  --shadow: 0 4px 24px rgba(0,0,0,0.3);
}
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  padding: 24px;
  line-height: 1.5;
}
.dashboard { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.header-icon { font-size: 28px; }
.header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
.header p { color: var(--text-secondary); font-size: 13px; }
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat {
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  transition: transform 0.2s;
}
.stat:hover { transform: translateY(-2px); }
.stat-value {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.chart-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
.sparkline { width: 100%; height: 80px; }
.sparkline polyline { fill: none; stroke: var(--accent-2); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.sparkline .area { fill: var(--accent-2); opacity: 0.1; }
.bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding-bottom: 24px; position: relative; }
.bar {
  flex: 1;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
  border-radius: 6px 6px 0 0;
  height: var(--h);
  min-height: 4px;
  position: relative;
  transition: opacity 0.2s;
}
.bar:hover { opacity: 0.8; }
.bar::after {
  content: attr(data-label);
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%) rotate(-30deg);
  font-size: 9px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.bar::before {
  content: attr(data-val);
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-2);
}
.rate-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: conic-gradient(var(--accent-3) ${rtkRate * 3.6}deg, rgba(255,255,255,0.05) 0);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
}
.rate-ring span { font-size: 18px; font-weight: 800; }
.footer { text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 8px; }
</style>
</head>
<body>
<div class="dashboard">
  <div class="header">
    <div class="header-icon">🦀</div>
    <div>
      <h1>RTK Token Optimizer</h1>
      <p>Live token savings dashboard — updates automatically</p>
    </div>
  </div>

  <div class="card">
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${totalRuns.toLocaleString()}</div>
        <div class="stat-label">Total Runs</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalTokensSaved.toLocaleString()}</div>
        <div class="stat-label">Tokens Saved</div>
      </div>
      <div class="stat">
        <div class="stat-value">${rtkRuns.toLocaleString()}</div>
        <div class="stat-label">RTK Runs</div>
      </div>
      <div class="stat">
        <div class="stat-value">${fallbackRuns.toLocaleString()}</div>
        <div class="stat-label">Fallbacks</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="chart-title">📊 RTK Adoption Rate</div>
    <div class="rate-ring"><span>${rtkRate}%</span></div>
  </div>

  <div class="card">
    <div class="chart-title">📈 Token Savings Trend (Last 20 Runs)</div>
    <svg class="sparkline" viewBox="0 0 300 60" preserveAspectRatio="none">
      <polygon class="area" points="0,60 ${sparkPoints} 300,60" />
      <polyline points="${sparkPoints}" />
    </svg>
  </div>

  <div class="card">
    <div class="chart-title">🏆 Top Commands by Tokens Saved</div>
    <div class="bar-chart">${bars}</div>
  </div>

  <div class="footer">RTK-AGNT Integration v3.0.0 • Data persisted locally</div>
</div>
</body>
</html>`;
  }
}

export default new RtkDashboard();
