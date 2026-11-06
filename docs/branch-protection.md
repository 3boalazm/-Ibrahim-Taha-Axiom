# Branch protection (recommended)

> Status: **recommendation only.** No repository settings were changed by the Phase 4 work. The owner applies these in GitHub → Settings → Branches (or Rulesets) for `main`.

## Required status check

After the first run of `.github/workflows/site-ci.yml`, GitHub offers the check under its job name:

- `Site CI / Build, QA, lab, tests`

Mark it as **required** before merging. The workflow only runs when `site/**` or the workflow file changes. If the check is required, a pull request that touches neither waits for a check that never runs. Either keep the check optional for documentation-only pull requests, or use a ruleset with path-aware required workflows.

## Suggested rules for `main`

| Rule | Suggested | Why |
| --- | --- | --- |
| Require a pull request before merging | On | Changes to approved researcher data stay reviewable |
| Require the status check above to pass | On | Build, QA, lab verification and tests gate every merge |
| Require branches to be up to date | Optional | Simple linear history; costs a re-run per merge |
| Block force pushes | On | Keeps history intact (a Phase 4 constraint) |
| Restrict deletions | On | |
| Require approvals | 1 if a second maintainer exists | The project currently has one maintainer |

## Vercel

Production deploys come from Vercel's Git integration on pushes to `main`. CI does not deploy. Preview deployments for pull requests come from Vercel, not from this workflow.
