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
  - Symfony: `vendor/bin/rector`, `vendor/bin/ecs --fix`, `vendor/bin/phpstan analyse`
  - React: `npm run lint`

## Frontend (react/)
- Install deps: `npm install`
- Lint: `npm run lint`
- Build: `npm run build`

## Backend (symfony/)
- Run Rector: `vendor/bin/rector`
- Run ECS (fix): `vendor/bin/ecs --fix`
- Run PHPStan: `vendor/bin/phpstan analyse`

## Conventions
- Prefer running tooling inside Docker when possible (see `make pre-commit`).
- Keep changes within the relevant app directory (`react/` or `symfony/`).
- Backend structure: follow DDD-inspired organization (group by domain, not by technical type).
- Frontend styling: use Tailwind CSS utility classes.
