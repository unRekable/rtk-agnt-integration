#!/usr/bin/env node
/**
 * Lightweight test runner for environments where jest binary isn't available.
 * Validates all rtk-runner logic without external test dependencies.
 */

const assert = require('assert');
const { exec } = require('child_process');

let execCalls = [];
let execIndex = 0;
let execMocks = [];

function mockExec(mocks) {
  execMocks = mocks;
  execIndex = 0;
  execCalls = [];
  require.cache[require.resolve('child_process')] = {
    id: require.resolve('child_process'),
    filename: require.resolve('child_process'),
    loaded: true,
    exports: {
      exec: function(cmd, opts, callback) {
        execCalls.push({ cmd, opts });
        const mock = execMocks[execIndex++];
        if (mock) {
          if (typeof opts === 'function') {
            opts(mock.error || null, mock.stdout || '', mock.stderr || '');
          } else {
            callback(mock.error || null, mock.stdout || '', mock.stderr || '');
          }
        }
      }
    }
  };
}

function restoreExec() {
  delete require.cache[require.resolve('child_process')];
}

function loadRunner() {
  delete require.cache[require.resolve('../src/rtk-runner.js')];
  return require('../src/rtk-runner.js');
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// === TESTS ===

test('rejects when command is missing', async () => {
  mockExec([]);
  const runner = loadRunner();
  const result = await runner.execute({});
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'Missing required parameter: command');
  restoreExec();
});

test('rejects when command is not a string', async () => {
  mockExec([]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 123 });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'Missing required parameter: command');
  restoreExec();
});

test('executes command through rtk by default', async () => {
  mockExec([
    { stdout: 'M  src/file.js\n?? new.txt\n', stderr: '' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'git status' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.rtkInstalled, true);
  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.stdout, 'M  src/file.js\n?? new.txt');
  assert.strictEqual(result.commandExecuted, 'rtk git status');
  assert.strictEqual(result.note, 'Output filtered via RTK for token optimization');
  assert.strictEqual(execCalls[0].cmd, 'rtk git status');
  assert.strictEqual(execCalls[0].opts.shell, '/bin/bash');
  restoreExec();
});

test('uses ultra-compact mode when flag is set', async () => {
  mockExec([
    { stdout: 'c1 nginx\nc2 redis\n', stderr: '' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'docker ps', ultraCompact: true });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.stdout, 'c1 nginx\nc2 redis');
  assert.strictEqual(result.commandExecuted, 'rtk -u docker ps');
  restoreExec();
});

test('uses custom working directory', async () => {
  mockExec([
    { stdout: 'ok', stderr: '' }
  ]);
  const runner = loadRunner();
  await runner.execute({ command: 'ls', workingDirectory: '/home/user/project' });
  assert.strictEqual(execCalls[0].opts.cwd, '/home/user/project');
  restoreExec();
});

test('falls back to raw command when rtk is not found', async () => {
  const rtkError = new Error('rtk not found');
  rtkError.code = 127;
  mockExec([
    { error: rtkError, stdout: '', stderr: '' },
    { stdout: 'raw output', stderr: '' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'git status' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.rtkInstalled, false);
  assert.strictEqual(result.tokensSaved, 0);
  assert.strictEqual(result.stdout, 'raw output');
  assert.ok(result.note.includes('RTK not found'));
  assert.strictEqual(execCalls[1].cmd, 'git status');
  restoreExec();
});

test('does not fallback when rawFallback is explicitly false', async () => {
  const rtkError = new Error('rtk not found');
  rtkError.code = 127;
  mockExec([
    { error: rtkError, stdout: '', stderr: '' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'git status', rawFallback: false });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.rtkInstalled, false);
  assert.strictEqual(result.exitCode, 127);
  restoreExec();
});

test('handles non-zero exit code when rtk is installed', async () => {
  const error = new Error('Command failed');
  error.code = 1;
  mockExec([
    { error, stdout: 'partial output', stderr: 'error msg' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'cargo test' });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.exitCode, 1);
  assert.strictEqual(result.stdout, 'partial output');
  assert.strictEqual(result.stderr, 'error msg');
  restoreExec();
});

test('handles empty stdout and stderr', async () => {
  mockExec([
    { stdout: '', stderr: '' }
  ]);
  const runner = loadRunner();
  const result = await runner.execute({ command: 'true' });
  assert.strictEqual(result.stdout, '');
  assert.strictEqual(result.stderr, '');
  assert.strictEqual(result.success, true);
  restoreExec();
});

// === RUNNER ===

async function runTests() {
  console.log('\n🧪 RTK-AGNT Integration Tests\n');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${t.name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
