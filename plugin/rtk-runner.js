import { executeRtk } from '../src/index.js';

/**
 * AGNT Plugin Tool: RTK Runner
 * Executes shell commands through RTK with automatic token savings tracking.
 */
class RtkRunner {
  constructor() {
    this.name = 'rtk-runner';
  }

  async execute(params) {
    try {
      return await executeRtk(params);
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return { error: error.message, success: false };
    }
  }
}

export default new RtkRunner();
