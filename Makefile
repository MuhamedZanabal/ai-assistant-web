# AI Assistant Web - Makefile
# Production-ready build and deployment commands

.PHONY: help install dev build test lint format typecheck docker-build docker-up docker-down \
        k8s-deploy k8s-delete migrate migrate-latest migrate-reset seed clean

# Default target
help:
	@echo "AI Assistant Web - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  install      - Install dependencies"
	@echo "  dev          - Start development server"
	@echo "  dev:db       - Start development with database"
	@echo ""
	@echo "Build:"
	@echo "  build        - Build for production"
	@echo "  docker-build - Build Docker image"
	@echo ""
	@echo "Testing:"
	@echo "  test         - Run all tests"
	@echo "  test:unit    - Run unit tests"
	@echo "  test:int     - Run integration tests"
	@echo "  test:e2e     - Run end-to-end tests"
	@echo "  test:coverage- Run tests with coverage"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint         - Run ESLint"
	@echo "  format       - Format code with Prettier"
	@echo "  format:check - Check code formatting"
	@echo "  typecheck    - Run TypeScript type checking"
	@echo "  audit        - Security audit (npm audit)"
	@echo ""
	@echo "Database:"
	@echo "  migrate      - Run database migrations"
	@echo "  migrate:new  - Create new migration"
	@echo "  migrate:reset- Reset database schema"
	@echo "  seed         - Seed database with initial data"
	@echo "  db:studio    - Open Prisma Studio"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up    - Start all services with Docker Compose"
	@echo "  docker-down  - Stop all Docker services"
	@echo "  docker:logs  - View Docker logs"
	@echo "  docker:ps    - List running containers"
	@echo ""
	@echo "Kubernetes:"
	@echo "  k8s:deploy   - Deploy to Kubernetes"
	@echo "  k8s:delete   - Delete Kubernetes resources"
	@echo "  k8s:status   - Check deployment status"
	@echo "  k8s:logs     - View Kubernetes logs"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean        - Clean build artifacts"
	@echo "  clean:all    - Clean everything including node_modules"

# Development
install:
	npm ci

dev:
	@echo "Starting development server..."
	@if [ -z "$$(docker ps -q -f name=ai-assistant-db 2>/dev/null)" ]; then \
		echo "Starting database..."; \
		docker-compose up -d db redis; \
	fi
	npx prisma generate
	next dev

dev:db:
	@echo "Starting full development environment..."
	docker-compose up -d
	npx prisma generate
	next dev

# Build
build:
	@echo "Building for production..."
	npx prisma generate
	next build

docker-build:
	@echo "Building Docker image..."
	docker build -t ai-assistant:latest .

# Testing
test:
	@echo "Running all tests..."
	npm run test

test:unit:
	@echo "Running unit tests..."
	npm run test:unit

test:int:
	@echo "Running integration tests..."
	npm run test:integration

test:e2e:
	@echo "Running end-to-end tests..."
	npm run test:e2e

test:coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage

# Code Quality
lint:
	@echo "Running ESLint..."
	npm run lint

format:
	@echo "Formatting code..."
	npm run format

format:check:
	@echo "Checking code formatting..."
	npm run format:check

typecheck:
	@echo "Running TypeScript check..."
	npm run typecheck

audit:
	@echo "Running security audit..."
	npm audit --audit-level=high

# Database
migrate:
	@echo "Running database migrations..."
	npx prisma migrate deploy

migrate:new:
	@echo "Creating new migration..."
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migrate:new name=migration_name"; \
		exit 1; \
	fi
	npx prisma migrate dev --name $(name)

migrate:reset:
	@echo "Resetting database schema..."
	npx prisma migrate reset --force

seed:
	@echo "Seeding database..."
	npx prisma db seed

db:studio:
	@echo "Opening Prisma Studio..."
	npx prisma studio

# Docker
docker-up:
	@echo "Starting Docker services..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down

docker:logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f

docker:ps:
	@echo "Listing running containers..."
	docker-compose ps

# Kubernetes
k8s-deploy:
	@echo "Deploying to Kubernetes..."
	kubectl apply -f infrastructure/kubernetes/

k8s-delete:
	@echo "Deleting Kubernetes resources..."
	kubectl delete -f infrastructure/kubernetes/

k8s:status:
	@echo "Checking deployment status..."
	kubectl get all -l app=ai-assistant

k8s:logs:
	@echo "Viewing Kubernetes logs..."
	kubectl logs -l app=ai-assistant -f --tail=100

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .next
	rm -rf node_modules/.prisma

clean:all:
	@echo "Cleaning everything..."
	rm -rf .next
	rm -rf node_modules
	rm -rf coverage
	rm -rf dist
	docker-compose down -v

# Production shortcuts
deploy: docker-build docker-up
prod-deploy: k8s-deploy
