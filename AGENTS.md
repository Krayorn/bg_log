## Project Overview
- Monorepo with `symfony/` (backend), `react/` (frontend), and `nginx/`.
- Development uses Docker Compose (`docker-compose.yml`).

## Quick Start
- Build containers: `make build`
- Start containers: `make up`
- Stop containers: `make down`
- Open Symfony container shell: `make symfony`

## Quality Checks
- Run full pre-commit checks: `make pre-commit`
- Backend only: `make backend-precommit`
- Frontend only: `make frontend-precommit`
- **Always run checks via `make` targets** — PHP is only available inside Docker, not on the host.

## Frontend (react/)
- Install deps: `npm install`
- Lint: `npm run lint` (or `make frontend-precommit`)
- Build: `npm run build`

## Backend (symfony/)
- Lint/analyse: `make backend-precommit` (runs rector, ecs, phpstan inside Docker)
- Do NOT run `vendor/bin/*` directly on the host — PHP is not installed locally.

## Conventions
- Prefer running tooling inside Docker when possible (see `make` targets).
- Keep changes within the relevant app directory (`react/` or `symfony/`).
- Backend structure: follow DDD-inspired organization (group by domain, not by technical type).
- Frontend styling: use Tailwind CSS utility classes.
