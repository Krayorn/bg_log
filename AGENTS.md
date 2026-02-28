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
- **Frontend types**: Shared API/domain types live in `react/src/types.ts`, derived from backend `view()` method shapes. Don't redeclare types locally in components — import from `types.ts`. Component-specific prop types stay local.
- **Frontend API calls**: Typed API functions live in `react/src/api/`, grouped by domain (e.g., `entries.ts`, `campaigns.ts`, `players.ts`). Don't call `apiGet`/`apiPost`/etc. directly from components — import named functions from `api/`. The low-level helpers in `react/src/hooks/useApi.ts` are only used by the `api/` layer.

## Testing
- Run tests: `make test` (runs PHPUnit inside Docker).
- Tests live in `symfony/tests/`, mirroring the `src/` domain structure (e.g., `tests/Player/`).
- Unit tests with mocked repositories — no HTTP or framework concerns in tests.
- **Be pragmatic**: only write tests for real business rules, edge cases, or bug fixes. Don't test trivial CRUD (persist + flush). If there's no logic worth validating, skip the test.
- **Assert on behavior, not infrastructure**: test return values and thrown exceptions. Don't `expects()->method('persist')` / `flush` — that's implementation detail. Proving persistence is an integration test concern.

## Backend Patterns
- **Handlers**: Business logic goes in handler classes under `Action/` folders (e.g., `Player/Action/CreateGuestPlayerHandler`). Controllers are thin HTTP adapters that parse requests, call handlers, and map exceptions to responses.
- **No Command DTO** unless the handler has 4+ parameters — pass primitives directly to `handle()`.
- **Exceptions**: Domain exceptions go in `Exception/` folders (e.g., `Player/Exception/DuplicateGuestPlayerException`). Controllers catch them and return appropriate HTTP responses.
- **Controllers** extend `App\Utils\BaseController`. Use `$this->getPlayer()` (returns `Player`, non-nullable) instead of `$this->getUser()`.
- **Request parsing**: Use `JsonPayload::fromRequest($request)` with typed accessors (`getString`, `getNonEmptyString`, `getOptionalString`) instead of manual `json_decode`. `JsonPayload` owns input shape validation (missing/empty/type); handlers own domain validation (duplicates, email format, business rules).
- **Static factories**: Prefer named static factory methods on entities when construction involves related setup (e.g., `Player::newGuest(name, number, owner)`).
- **Never use `view()` for internal access**: `view()` is a serialization method for HTTP responses. To read entity state in handlers or tests, use typed getters (e.g., `$game->getName()`, not `$game->view()['name']`). Add a getter if one doesn't exist.
- **Cross-domain utilities** live in `App\Utils\` (e.g., `BaseController`, `JsonPayload`).

## Adding a New Aggregate Root (Symfony)
When creating a new domain directory under `symfony/src/`:
1. **Register routes** in `symfony/config/routes.yaml`.
2. **Exclude the entity from autowiring** in `symfony/config/services.yaml`.
3. **Register the Doctrine mapping** in `symfony/config/packages/doctrine.yaml`.
See existing entries for `Game`, `Entry`, `Player` as examples.
