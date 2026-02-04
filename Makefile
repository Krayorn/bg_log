.PHONY: build up down symfony deploy

build:
	docker-compose up -d --build

up:
	docker-compose up -d

down:
	docker-compose down

symfony:
	docker exec -it bg_log-symfony-1 bash

.PHONY: pre-commit
pre-commit:
	docker exec -it bg_log-symfony-1 vendor/bin/rector
	docker exec -it bg_log-symfony-1 vendor/bin/ecs --fix
	docker exec -it bg_log-symfony-1 vendor/bin/phpstan analyse
	cd react && npm run lint

deploy:
	@echo "Select version bump type:"
	@echo "  1) patch (x.x.X)"
	@echo "  2) minor (x.X.0)"
	@echo "  3) major (X.0.0)"
	@printf "Enter choice [1-3]: "; \
	read choice; \
	current_version=$$(grep "^VITE_APP_VERSION=" react/.env | cut -d'=' -f2); \
	major=$$(echo "$$current_version" | cut -d'.' -f1); \
	minor=$$(echo "$$current_version" | cut -d'.' -f2); \
	patch=$$(echo "$$current_version" | cut -d'.' -f3); \
	case $$choice in \
		1) new_version="$$major.$$minor.$$((patch + 1))";; \
		2) new_version="$$major.$$((minor + 1)).0";; \
		3) new_version="$$((major + 1)).0.0";; \
		*) echo "Invalid choice"; exit 1;; \
	esac; \
	today=$$(date +%Y-%m-%d); \
	sed -i "s/^VITE_APP_VERSION=.*/VITE_APP_VERSION=$$new_version/" react/.env; \
	sed -i "s/^VITE_RELEASE_DATE=.*/VITE_RELEASE_DATE=$$today/" react/.env; \
	echo "Updated to version $$new_version (released $$today)"
	docker-compose down
	cd react && npm run build
	docker-compose up -d --build
