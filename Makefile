.PHONY: help setup dev test

help: ## Show available commands
	@grep -E '^[a-z]+:.*##' Makefile | sed -E 's/:.*##/\t/'

setup: ## Install dependencies, create env files, start Postgres, create the schema
	./scripts/setup.sh

dev: ## Start Postgres, the API and the web/mobile dev servers
	./scripts/dev.sh

test: ## Run the JavaScript and Python test suites
	pnpm test
	cd apps/api-py && PYTHONPATH=. .venv/bin/pytest tests
