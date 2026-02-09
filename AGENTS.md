## Project Overview
- Monorepo: `symfony/` (backend), `react/` (frontend), `nginx/`.
- Development runs in Docker Compose.

## Quality Checks
- Full pre-commit: `make pre-commit`
- Backend only: `make backend-precommit`
- Frontend only: `make frontend-precommit`
- **Always run checks via `make` targets** — PHP is only available inside Docker.
- After any change, run the relevant pre-commit target(s) based on which directories were modified.

## Conventions
- Do NOT run `vendor/bin/*` directly on the host.
- Backend structure: DDD-inspired (group by domain, not by technical type).
- Frontend styling: Tailwind CSS utility classes.
- Keep changes within the relevant app directory.

## Adding a New Aggregate Root (Symfony)
When creating a new domain directory under `symfony/src/`:
1. **Register routes** in `symfony/config/routes.yaml`.
2. **Exclude the entity from autowiring** in `symfony/config/services.yaml`.
3. **Register the Doctrine mapping** in `symfony/config/packages/doctrine.yaml`.
See existing entries for `Game`, `Entry`, `Player` as examples.
