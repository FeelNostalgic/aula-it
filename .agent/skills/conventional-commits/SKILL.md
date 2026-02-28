---
name: conventional-commits
description: >
  Conventional Commits and semantic versioning patterns for this project.
  Trigger: When writing commit messages, bumping versions, or reviewing git history.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Writing or suggesting git commit messages
- Reviewing commit history or changelogs
- Bumping project version
- Creating releases or tags
- Configuring CI/CD pipelines with version automation

---

## Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

---

## Critical Patterns

### Types and Version Bumps

| Type | Bump | When to use |
|------|------|-------------|
| `fix` | **patch** | Bug fixes, corrections |
| `feat` | **minor** | New functionality |
| `feat!` | **major** | Breaking changes |
| `refactor` | **patch** | Code restructuring, no behavior change |
| `style` | **patch** | Visual/CSS changes, formatting |
| `docs` | **patch** | Documentation only |
| `test` | **patch** | Adding or updating tests |
| `ci` | **patch** | CI/CD pipeline changes |
| `chore` | **patch** | Dependencies, maintenance |
| `perf` | **patch** | Performance improvements |
| `build` | **patch** | Build system changes |

### Breaking Changes (Major Bump)

Two ways to signal a breaking change:

```bash
# Option 1: Bang after type
feat!: redesign authentication API

# Option 2: Footer
feat: redesign authentication API

BREAKING CHANGE: token format changed from JWT to opaque
```

### Scopes (Optional)

Use scope to indicate the area of change:

```bash
fix(auth): correct session expiration
feat(dashboard): add analytics widget
style(sidebar): adjust spacing
```

---

## Decision Tree

```
Is it a bug fix?                          → fix:
Is it a new feature?                      → feat:
Does it break existing functionality?     → feat!: or BREAKING CHANGE footer
Is it code cleanup with no behavior change? → refactor:
Is it a visual/CSS change?               → style:
Is it documentation?                      → docs:
Is it a test?                             → test:
Is it CI/CD?                              → ci:
Is it dependency updates?                 → chore:
Is it a performance improvement?          → perf:
Does it change the build system?          → build:
None of the above?                        → No prefix (no version bump)
```

---

## Code Examples

### Patch commits

```bash
fix: correct email validation regex
fix(auth): handle expired refresh tokens
refactor: extract helper functions from dashboard
style: adjust card border radius
docs: update API endpoint documentation
test: add registration flow tests
ci: update Node.js version in workflow
chore: update dependencies
perf: lazy-load dashboard charts
build: update next.config for turbopack
```

### Minor commits

```bash
feat: add user profile page
feat(discover): add season filter
feat(dashboard): add export to CSV
```

### Major commits

```bash
feat!: migrate from REST to GraphQL API
feat!: drop support for Node.js 18

feat: redesign database schema

BREAKING CHANGE: user table renamed to profiles, all queries must be updated
```

---

## Pipeline Integration

This project uses GitHub Actions to automate versioning. The CI pipeline:

1. Reads the commit message prefix on push to `main`
2. Determines bump type (`patch`, `minor`, `major`)
3. Runs `npm version` to update `package.json`
4. Creates a git tag (`v0.2.0`)
5. Pushes the commit with `[skip ci]` to avoid loops
6. Creates a GitHub Release with auto-generated changelog

**No prefix = no version bump** (but tests still run and deploy still happens).

---

## Commands

```bash
# Standard commits
git commit -m "fix: description"        # patch
git commit -m "feat: description"       # minor
git commit -m "feat!: description"      # major

# With scope
git commit -m "fix(auth): description"

# Check current version
node -p "require('./package.json').version"

# Manual version bump (if needed)
npm version patch    # 0.1.0 → 0.1.1
npm version minor    # 0.1.0 → 0.2.0
npm version major    # 0.1.0 → 1.0.0
```

---

## Resources

- **Pipeline config**: See [ci.yml](../../../.github/workflows/ci.yml) for the GitHub Actions workflow
- **Version constant**: See [version.ts](../../../lib/version.ts) for how the version is exposed to the UI
- **Spec**: [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/)
