# User profile — CodeRabbit review guide

## Branches

| Branch | Purpose |
|--------|---------|
| `pre-profile-baseline` | Frozen commit **before** the profile rebuild (PR base for full diff) |
| `feature/user-profile` | Active profile work; open PRs target `pre-profile-baseline` |
| `main` | Production line; merge profile PR when review is complete |

## Pull request

Open (or use the existing draft):

**Base:** `pre-profile-baseline` → **Head:** `feature/user-profile`

This shows the **entire** profile feature in one diff, not just the latest commits.

## Trigger a full review

1. Push latest work to `feature/user-profile`.
2. On the draft PR, comment:

   ```text
   @coderabbitai full review
   ```

3. CodeRabbit reads `.coderabbit.yaml` path instructions and reviews frontend, API, services, and schema as one feature.

## Scope (file map)

- **Web page:** `apps/web/src/app/user-dashboard/profile/`
- **Components:** `apps/web/src/components/profile/`
- **Helpers:** `apps/web/src/lib/profileSummary.ts`, `profileSignals.ts`, `endUserProfile.ts`
- **API router:** `apps/api/src/server/routers/profile/`
- **Services:** résumé parse/text, skill infer, US location, profile seed
- **Schema / seed:** `apps/api/prisma/schema.prisma` (profile models), `seed-profile.ts`, `profile-taxonomy.seed.ts`

## After review

Merge `feature/user-profile` → `main` when satisfied. Keep `pre-profile-baseline` for reference; do not delete until the PR is merged.
