# RTK-AGNT Integration

[![CI](https://github.com/your-username/rtk-agnt-integration/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/rtk-agnt-integration/actions)
[![codecov](https://codecov.io/gh/your-username/rtk-agnt-integration/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/rtk-agnt-integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> AGNT plugin and Node.js wrapper for [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk). Compress shell command output by **60-90%** before it reaches your LLM context.

---

## What Is This?

This project bridges [RTK](https://github.com/rtk-ai/rtk) — a high-performance CLI proxy written in Rust — with [AGNT](https://github.com/agnt-gg/agnt), the local-first AI agent operating system.

Instead of dumping raw `git status`, `cargo test`, or `docker ps` output into your LLM prompt (burning thousands of tokens), this tool pipes everything through RTK first. You get the same information, just condensed and optimized.

### Token Savings

| Command | Raw Tokens | RTK Output | Savings |
|---------|-----------|------------|---------|
| `git status` | ~3,000 | ~600 | **-80%** |
| `cargo test` | ~25,000 | ~2,500 | **-90%** |
| `docker ps` | ~900 | ~180 | **-80%** |
| `ls -la` | ~2,000 | ~400 | **-80%** |

---

## Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **RTK** installed on your system:
  ```bash
  # macOS / Linux
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

  # or Homebrew
  brew install rtk
  ```
- **AGNT** running locally ([install guide](https://github.com/agnt-gg/agnt))

### Option A: Install from GitHub Releases

1. Download the latest `.agnt` file from [Releases](https://github.com/your-username/rtk-agnt-integration/releases).
2. In AGNT: **Marketplace → Install from file** → select the `.agnt` file.
3. Done. The plugin hot-reloads automatically.

### Option B: Install from Source

```bash
# Clone the repository
git clone https://github.com/your-username/rtk-agnt-integration.git
cd rtk-agnt-integration

# Install dependencies & run tests
npm install
npm test

# Install plugin into AGNT
npm run install:agnt
```

### Option C: Manual Copy

```bash
# Copy plugin directory into AGNT plugins folder
cp -r plugin/ ~/.agnt/data/plugins/rtk-agnt-integration
```

---

## Usage

Once installed, the `rtk-runner` tool is available to your AGNT agents and workflows.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `command` | `string` | ✅ | — | Shell command to execute (e.g. `git status`) |
| `workingDirectory` | `string` | ❌ | `process.cwd()` | Directory to run the command in |
| `ultraCompact` | `boolean` | ❌ | `false` | Pass `-u` to RTK for maximum compression |
| `rawFallback` | `boolean` | ❌ | `true` | If RTK is missing, run raw command instead |

### Example: Agent Chat

```json
{
  "command": "git status"
}
```

**Response:**
```json
{
  "success": true,
  "rtkInstalled": true,
  "exitCode": 0,
  "stdout": "M  src/file.js\n?? new.txt",
  "stderr": "",
  "commandExecuted": "rtk git status",
  "note": "Output filtered via RTK for token optimization"
}
```

### Example: With Working Directory

```json
{
  "command": "cargo test",
  "workingDirectory": "/home/user/my-rust-project",
  "ultraCompact": true
}
```

### Example: In a Workflow

Use the `rtk-runner` node in the AGNT visual workflow designer. Connect it after a trigger (e.g., file change webhook) and before an LLM prompt node.

---

## Supported Commands

Any command RTK supports works through this wrapper:

- **Git:** `git status`, `git log`, `git diff`, `git add`, `git commit`
- **Rust:** `cargo test`, `cargo build`, `cargo clippy`
- **Containers:** `docker ps`, `docker logs`, `docker inspect`
- **Kubernetes:** `kubectl get pods`, `kubectl logs`
- **Python:** `pytest`, `ruff check`
- **Go:** `go test`
- **Node:** `npm test`, `jest`
- **System:** `ls`, `tree`, `cat`, `grep`, `rg`, `read`
- **Cloud:** `aws s3 ls`, `gh pr list`

See the [RTK documentation](https://www.rtk-ai.app/guide) for the full list.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  AGNT Agent │────▶│  rtk-runner  │────▶│   RTK CLI   │
│  or Workflow│     │  (this tool) │     │  (Rust bin) │
└─────────────┘     └──────────────┘     └─────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ Shell Output │
                       │  (compressed)│
                       └──────────────┘
```

### Fallback Behavior

If RTK is not installed (exit code `127`), the tool automatically falls back to raw command execution — your workflows never break, they just use more tokens until you install RTK.

---

## Development

```bash
# Clone
git clone https://github.com/your-username/rtk-agnt-integration.git
cd rtk-agnt-integration

# Install dependencies
npm install

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Build plugin package
npm run build:plugin
```

### Project Structure

```
rtk-agnt-integration/
├── .github/workflows/       # CI/CD pipelines
├── __tests__/               # Jest test suite
├── bin/                     # CLI helpers
│   ├── build-plugin.js      # Build .agnt package
│   └── install-to-agnt.js   # Install to local AGNT
├── plugin/                  # AGNT plugin files
│   ├── manifest.json        # Plugin metadata
│   └── rtk-runner.js        # Plugin entry point
├── src/                     # Core library
│   └── rtk-runner.js        # Reusable runner class
├── jest.config.js           # Test configuration
├── package.json             # Node.js manifest
└── README.md                # You are here
```

---

## Testing

This project follows **Test-Driven Development (TDD)**.

- **Unit tests:** `__tests__/rtk-runner.test.js` — mocks `child_process.exec`
- **Coverage threshold:** 80% branches, functions, lines, statements
- **CI:** GitHub Actions runs tests on Node 18, 20, 22

Run locally:

```bash
npm test
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (see TDD section above)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Linter is clean (`npm run lint`)
- Code coverage stays above 80%

---

## License

[MIT](LICENSE) © RTK-AGNT Integration Contributors

---

## Acknowledgments

- [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) by the RTK team
- [AGNT](https://github.com/agnt-gg/agnt) by the AGNT team
