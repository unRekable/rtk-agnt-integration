# Contributing to RTK-AGNT Integration

Thank you for your interest in contributing! This project follows strict quality standards to ensure reliability in production AGNT deployments.

## Development Workflow

### 1. Fork & Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Test-Driven Development

**All changes require tests.** Write the test first, watch it fail, then implement.

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

### 3. Code Standards

- **ES Modules only** (`import/export`) for AGNT plugin code
- **CommonJS** (`require/module.exports`) allowed for Node.js test utilities
- All error paths must return `{ error: "..." }` — never throw uncaught exceptions
- Log errors with `[${this.name}]` prefix for traceability
- Keep `this.name` identical to manifest `tool.type`

### 4. Coverage Threshold

| Metric | Minimum |
|--------|---------|
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |
| Statements | 80% |

### 5. Linting

```bash
npm run lint
```

### 6. Plugin Build Verification

Before submitting, verify the plugin builds cleanly:

```bash
npm run build:plugin
# → produces rtk-agnt-integration.agnt
```

### 7. Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ultra-compact mode support
fix: handle null stdout in fallback mode
docs: update README with docker examples
test: add edge case for exit code 127
refactor: simplify promise resolution
ci: add Node 22 to test matrix
```

### 8. Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Coverage meets thresholds
- [ ] Linter clean (`npm run lint`)
- [ ] Plugin builds (`npm run build:plugin`)
- [ ] Documentation updated (README, inline JSDoc)
- [ ] Commit messages follow convention

## Reporting Issues

Please include:
1. AGNT version
2. Node.js version
3. RTK version (`rtk --version`)
4. Minimal reproduction steps
5. Expected vs. actual behavior

## Security

For security vulnerabilities, please email security@rtk-agnt.dev instead of opening a public issue.
