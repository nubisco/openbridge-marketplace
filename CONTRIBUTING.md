# Contributing

Thanks for contributing to `openbridge-marketplace`.

This repository is public so the community can inspect the marketplace logic and contribute improvements, while the official hosted marketplace remains the Nubisco-operated service described in [LICENSE](LICENSE) and [TRADEMARKS.md](TRADEMARKS.md).

## Local Setup

```bash
git clone https://github.com/nubisco/openbridge-marketplace.git
cd openbridge-marketplace
bun install
```

## Development Commands

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run quality:check
```

Notes:

- Minimum supported Node.js version is `20`
- Bun is required for the API server and crawler workflows
- Branching and releases target `master`

## Contributor License Agreement (CLA)

To keep the project legally consistent, all contributions are made under the Individual CLA:

- See `docs/CLA-INDIVIDUAL.md`
- You retain ownership of your work
- You grant Nubisco rights to use, distribute, commercialize, and relicense contributions

By opening a pull request, you must explicitly confirm you agree to the CLA in the pull request template.

## Branch and PR Expectations

- Create focused branches with one concern per PR
- Keep pull requests small and reviewable
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`)
- Run the quality gate before opening a PR
- Confirm CLA agreement in the PR checklist

## Contribution Workflow

1. Fork and branch from `master`.
2. Make focused changes and keep commits clear.
3. Run `pnpm run quality:check`.
4. Update docs when behavior, policy, or public APIs change.
5. Open a pull request and complete the template, including explicit CLA confirmation.
6. Address review feedback without expanding the original scope unnecessarily.

## What to Change Where

- `src/` for the Vue frontend
- `server/` for the API server and crawler
- `shared/` for cross-runtime TypeScript types
- `.github/` for repository automation and contribution workflows

If you need a generic UI primitive, prefer adding it to `@nubisco/ui` first rather than recreating it locally in this project.

## Coding Style

- Vue 3 with TypeScript strict mode
- 2-space indentation, LF line endings, no semicolons, single quotes
- Keep changes minimal and avoid unrelated refactors
- Do not weaken ranking, moderation, or transparency language without updating the corresponding user-facing documentation

## Issue Routing

- Use **Bug report** for reproducible defects in the UI, API, crawler, or ranking behavior
- Use **Feature request** for marketplace improvements
- Use **Policy / transparency request** for questions about ranking visibility, moderation, or public marketplace mechanics
- Use private security reporting for vulnerabilities

## Quality Gate

Before committing or pushing, run:

```sh
pnpm run quality:check
```

The local Git hooks are expected to enforce the same gate automatically. Commits must not proceed unless tests, linting, formatting, and type checks all pass.
