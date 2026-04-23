const { exec } = require('child_process');
const path = require('path');
const RtkRunner = require('../src/rtk-runner');

jest.mock('child_process');

describe('RtkRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parameter validation', () => {
    test('rejects when command is missing', async () => {
      const result = await RtkRunner.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameter: command');
    });

    test('rejects when command is not a string', async () => {
      const result = await RtkRunner.execute({ command: 123 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameter: command');
    });
  });

  describe('rtk execution', () => {
    test('executes command through rtk by default', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        expect(cmd).toBe('rtk git status');
        expect(opts.shell).toBe('/bin/bash');
        callback(null, 'M  src/file.js\n?? new.txt\n', '');
      });

      const result = await RtkRunner.execute({ command: 'git status' });

      expect(result.success).toBe(true);
      expect(result.rtkInstalled).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('M  src/file.js\n?? new.txt');
      expect(result.commandExecuted).toBe('rtk git status');
      expect(result.note).toBe('Output filtered via RTK for token optimization');
    });

    test('uses ultra-compact mode when flag is set', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        expect(cmd).toBe('rtk -u docker ps');
        callback(null, 'c1 nginx\nc2 redis\n', '');
      });

      const result = await RtkRunner.execute({
        command: 'docker ps',
        ultraCompact: true
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('c1 nginx\nc2 redis');
      expect(result.commandExecuted).toBe('rtk -u docker ps');
    });

    test('uses custom working directory', async () => {
      const customCwd = '/home/user/project';
      exec.mockImplementation((cmd, opts, callback) => {
        expect(opts.cwd).toBe(customCwd);
        callback(null, 'ok', '');
      });

      await RtkRunner.execute({
        command: 'ls',
        workingDirectory: customCwd
      });

      expect(exec).toHaveBeenCalledWith(
        'rtk ls',
        expect.objectContaining({ cwd: customCwd }),
        expect.any(Function)
      );
    });

    test('resolves working directory with path.resolve', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'ok', '');
      });

      await RtkRunner.execute({
        command: 'pwd',
        workingDirectory: './relative'
      });

      expect(exec).toHaveBeenCalledWith(
        'rtk pwd',
        expect.objectContaining({
          cwd: path.resolve('./relative')
        }),
        expect.any(Function)
      );
    });

    test('handles stderr when rtk is installed', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        callback(null, 'output', 'some warning');
      });

      const result = await RtkRunner.execute({ command: 'cargo test' });

      expect(result.success).toBe(true);
      expect(result.stderr).toBe('some warning');
    });

    test('handles non-zero exit code when rtk is installed', async () => {
      const error = new Error('Command failed');
      error.code = 1;
      exec.mockImplementation((cmd, opts, callback) => {
        callback(error, 'partial output', 'error msg');
      });

      const result = await RtkRunner.execute({ command: 'cargo test' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('partial output');
      expect(result.stderr).toBe('error msg');
    });
  });

  describe('rtk not installed fallback', () => {
    test('falls back to raw command when rtk is not found (exit 127)', async () => {
      const rtkError = new Error('rtk not found');
      rtkError.code = 127;

      exec.mockImplementationOnce((cmd, opts, callback) => {
        callback(rtkError, '', '');
      }).mockImplementationOnce((cmd, opts, callback) => {
        expect(cmd).toBe('git status');
        callback(null, 'raw output', '');
      });

      const result = await RtkRunner.execute({ command: 'git status' });

      expect(result.success).toBe(true);
      expect(result.rtkInstalled).toBe(false);
      expect(result.tokensSaved).toBe(0);
      expect(result.stdout).toBe('raw output');
      expect(result.note).toContain('RTK not found');
    });

    test('does not fallback when rawFallback is explicitly false', async () => {
      const rtkError = new Error('rtk not found');
      rtkError.code = 127;

      exec.mockImplementation((cmd, opts, callback) => {
        callback(rtkError, '', '');
      });

      const result = await RtkRunner.execute({
        command: 'git status',
        rawFallback: false
      });

      expect(result.success).toBe(false);
      expect(result.rtkInstalled).toBe(false);
      expect(result.exitCode).toBe(127);
      expect(result.note).toContain('RTK not found');
    });

    test('falls back with stderr preserved', async () => {
      const rtkError = new Error('rtk not found');
      rtkError.code = 127;

      exec.mockImplementationOnce((cmd, opts, callback) => {
        callback(rtkError, '', '');
      }).mockImplementationOnce((cmd, opts, callback) => {
        callback(null, 'output', 'raw stderr');
      });

      const result = await RtkRunner.execute({ command: 'ls' });

      expect(result.stderr).toBe('raw stderr');
    });

    test('falls back with non-zero raw exit code', async () => {
      const rtkError = new Error('rtk not found');
      rtkError.code = 127;
      const rawError = new Error('command failed');
      rawError.code = 2;

      exec.mockImplementationOnce((cmd, opts, callback) => {
        callback(rtkError, '', '');
      }).mockImplementationOnce((cmd, opts, callback) => {
        callback(rawError, '', 'permission denied');
      });

      const result = await RtkRunner.execute({ command: 'cat secret' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toBe('permission denied');
    });

    test('handles null stdout/stderr in fallback', async () => {
      const rtkError = new Error('rtk not found');
      rtkError.code = 127;

      exec.mockImplementationOnce((cmd, opts, callback) => {
        callback(rtkError, null, null);
      }).mockImplementationOnce((cmd, opts, callback) => {
        callback(null, null, null);
      });

      const result = await RtkRunner.execute({ command: 'echo hi' });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });
  });

  describe('edge cases', () => {
    test('handles empty stdout and stderr', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        callback(null, '', '');
      });

      const result = await RtkRunner.execute({ command: 'true' });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
      expect(result.success).toBe(true);
    });

    test('handles whitespace-only stdout', async () => {
      exec.mockImplementation((cmd, opts, callback) => {
        callback(null, '   \n\t  ', '');
      });

      const result = await RtkRunner.execute({ command: 'echo ""' });

      expect(result.stdout).toBe('');
    });
  });
});
