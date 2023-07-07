.PHONY: build up down symfony

build:
	docker-compose up -d --build

up:
	docker-compose up -d

down:
	docker-compose down

symfony:
	docker exec -it bglog-symfony-1 bash
