.PHONY: build up down symfony

build:
	docker-compose up -d --build

up:
	docker-compose up -d

down:
	docker-compose down

symfony:
	docker exec -it bglog-symfony-1 bash

.PHONY: pre-commit
pre-commit:
	docker exec -it bglog-symfony-1 vendor/bin/rector
	docker exec -it bglog-symfony-1 vendor/bin/ecs --fix
	docker exec -it bglog-symfony-1 vendor/bin/phpstan analyse
