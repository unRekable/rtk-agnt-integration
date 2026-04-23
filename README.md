# RTK-AGNT Integration

[![CI](https://github.com/unRekable/rtk-agnt-integration/actions/workflows/ci.yml/badge.svg)](https://github.com/unRekable/rtk-agnt-integration/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AGNT Plugin](https://img.shields.io/badge/AGNT-Plugin-e53d8f)](https://github.com/agnt-gg/agnt)

> AGNT plugin for [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) with token savings tracking, stats utility, and theme-aware dashboard widget.

```mermaid
graph TD
    A[Agent / Workflow] --> B[RTK Runner]
    A --> C[RTK Stats]
    A --> D[RTK Dashboard]
    B --> E[RTK CLI]
    E --> F[Shell Commands]
    B --> G[Token Tracker]
    G --> H[(stats.json)]
    C --> H
    D --> H
    D --> I[HTML Widget]

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#f3e5f5
    style D fill:#f3e5f5
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#e8f5e9
    style H fill:#e8f5e9
    style I fill:#fce4ec
```

```mermaid
sequenceDiagram
    participant User as Agent
    participant Runner as RTK Runner
    participant RTK as RTK CLI
    participant Tracker as Token Tracker
    participant Stats as stats.json
    participant Dash as RTK Dashboard

    User->>Runner: execute({ command: "git status" })
    Runner->>RTK: rtk git status
    RTK-->>Runner: compressed output
    Runner->>Tracker: recordRun()
    Tracker->>Stats: persist tokensSaved
    Stats-->>Tracker: updated stats
    Tracker-->>Runner: { savings, stats }
    Runner-->>User: { stdout, tokensSaved, totalTokensSaved }

    User->>Dash: execute()
    Dash->>Stats: loadStats()
    Stats-->>Dash: all-time data
    Dash-->>User: HTML widget
```

---

## What This Plugin Does

Runs shell commands through [RTK](https://github.com/rtk-ai/rtk) to compress output by **60-90%** before LLM ingestion.

**Supported RTK commands:** `git status`, `git log`, `git diff`, `cargo test`, `cargo build`, `docker ps`, `docker logs`, `kubectl get pods`, `ls`, `pytest`, `npm test`, `go test`

| Command | Raw Tokens | RTK Output | Savings |
|---------|-----------|------------|---------|
| `git status` | ~3,000 | ~600 | **-80%** |
| `cargo test` | ~25,000 | ~2,500 | **-90%** |
| `docker ps` | ~900 | ~180 | **-80%** |

---

## Prerequisites

RTK must be installed before using this plugin.

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

Verify: `rtk --version`

---

## Installation

1. Download `rtk-agnt-integration.agnt` from [Releases](https://github.com/unRekable/rtk-agnt-integration/releases/latest)
2. In AGNT: **Marketplace → Install from file** → select the `.agnt` file
3. Plugin hot-reloads automatically

---

## Tools

### RTK Runner (`rtk-runner`)

Executes shell commands via RTK with automatic token savings tracking.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `command` | `string` | ✅ | — | Shell command passed to RTK |
| `workingDirectory` | `string` | ❌ | `process.cwd()` | Execution directory |
| `ultraCompact` | `boolean` | ❌ | `false` | Adds `-u` flag for max compression |
| `rawFallback` | `boolean` | ❌ | `true` | Falls back to raw output if RTK unavailable |

**Returns:** `success`, `stdout`, `stderr`, `exitCode`, `tokensSaved`, `percentSaved`, `totalTokensSaved`, `totalRuns`

### RTK Stats (`rtk-stats`)

Retrieves token savings statistics.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | `select` | ❌ | `all` | `all`, `today`, `week`, `month` |

**Returns:** `success`, `totalRuns`, `rtkRuns`, `fallbackRuns`, `totalTokensSaved`, `commands`, `history`

### RTK Dashboard (`rtk-dashboard`)

Renders a visual HTML widget with token savings charts.

**Parameters:** None

**Returns:** `html` (self-contained widget with stat cards, adoption ring, sparkline, bar chart)

---

## Token Tracking

All runs are recorded to `~/.rtk-agnt-stats/stats.json`:
- Total runs, RTK runs, fallback runs
- Tokens saved per run (cumulative)
- Per-command breakdown
- Last 100 executions

---

## Development

```bash
git clone https://github.com/unRekable/rtk-agnt-integration.git
cd rtk-agnt-integration
npm install
npm test
npm run build:plugin
```

## License

[MIT](LICENSE)
