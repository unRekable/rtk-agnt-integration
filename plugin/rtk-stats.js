import { loadStats } from '../src/index.js';

class RtkStats {
  constructor() {
    this.name = 'rtk-stats';
  }

  async execute(params) {
    try {
      const { period = 'all' } = params || {};
      const stats = loadStats();

      let history = stats.history;
      const now = new Date();

      if (period === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        history = history.filter(h => new Date(h.timestamp) >= start);
      } else if (period === 'week') {
        const start = new Date(now.getTime() - 7 * 86400000);
        history = history.filter(h => new Date(h.timestamp) >= start);
      } else if (period === 'month') {
        const start = new Date(now.getTime() - 30 * 86400000);
        history = history.filter(h => new Date(h.timestamp) >= start);
      }

      const tokensSaved = history.reduce((sum, h) => sum + (h.tokensSaved || 0), 0);
      const rtkRuns = history.filter(h => h.rtkInstalled).length;
      const fallbackRuns = history.filter(h => !h.rtkInstalled).length;

      return {
        success: true,
        totalRuns: history.length,
        rtkRuns,
        fallbackRuns,
        totalTokensSaved: tokensSaved,
        commands: stats.commands,
        history: history.slice(-20),
        period
      };
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return { error: error.message, success: false };
    }
  }
}

export default new RtkStats();