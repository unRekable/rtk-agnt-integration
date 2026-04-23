import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AGNT Plugin: RTK Runner
 * Wraps RTK (Rust Token Killer) for shell command token optimization.
 * Saves 60-90% tokens by compressing output before LLM ingestion.
 */
class RtkRunner {
  constructor() {
    this.name = 'rtk-runner'; // must match manifest tool.type
  }

  async execute(params, inputData, workflowEngine) {
    try {
      const { command, workingDirectory, ultraCompact, rawFallback } = params || {};

      if (!command || typeof command !== 'string') {
        return {
          success: false,
          error: 'Missing required parameter: command',
          result: null
        };
      }

      const cwd = workingDirectory ? path.resolve(workingDirectory) : process.cwd();
      const flags = ultraCompact ? '-u ' : '';
      const rtkCmd = `rtk ${flags}${command}`;

      return new Promise((resolve) => {
        exec(rtkCmd, { cwd, shell: '/bin/bash', env: process.env }, (error, stdout, stderr) => {
          // RTK not found (exit code 127) and fallback is enabled
          if (error && error.code === 127 && rawFallback !== false) {
            this._executeRaw(command, cwd, resolve);
            return;
          }

          resolve({
            success: !error || error.code === 0,
            rtkInstalled: !(error && error.code === 127),
            exitCode: error ? error.code : 0,
            stdout: stdout ? stdout.trim() : '',
            stderr: stderr ? stderr.trim() : '',
            commandExecuted: rtkCmd,
            tokensSaved: error && error.code === 127 ? 0 : 'estimated',
            note: error && error.code === 127
              ? 'RTK not found — returned raw output. Install RTK from https://github.com/rtk-ai/rtk'
              : 'Output filtered via RTK for token optimization'
          });
        });
      });
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return { error: error.message, success: false };
    }
  }

  /**
   * Execute raw command without RTK (fallback mode)
   * @private
   */
  _executeRaw(command, cwd, resolve) {
    exec(command, { cwd, shell: '/bin/bash', env: process.env }, (error, stdout, stderr) => {
      resolve({
        success: !error || error.code === 0,
        rtkInstalled: false,
        exitCode: error ? error.code : 0,
        stdout: stdout ? stdout.trim() : '',
        stderr: stderr ? stderr.trim() : '',
        tokensSaved: 0,
        note: 'RTK not found — returned raw output. Install RTK from https://github.com/rtk-ai/rtk'
      });
    });
  }
}

export default new RtkRunner();
