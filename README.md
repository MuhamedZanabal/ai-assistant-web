# AI Assistant Web

Production-ready AI Assistant Web Interface built with Next.js, OpenAI, and TypeScript.

## Features

- **Chat Interface**: Real-time streaming chat with AI assistant
- **Tool Calling**: Function calling support for extended capabilities
- **Session Management**: Persistent conversations with PostgreSQL
- **Observability**: OpenTelemetry instrumentation for metrics, traces, and logs
- **Security**: JWT authentication, rate limiting, and input validation
- **Container Ready**: Docker and Kubernetes deployment configurations

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-assistant-web.git
cd ai-assistant-web

# Install dependencies
npm ci

# Copy environment file
cp .env.example .env.local

# Configure your environment
# Edit .env.local with your API keys and database URL

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Docker Compose (Recommended)

```bash
# Start all services including database and Redis
docker-compose up -d

# Access the application
# http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Chat UI   │  │  API Routes │  │  OpenAI Integration    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │  PostgreSQL │  │    Redis    │  │   OpenAI    │
     │  (Sessions) │  │  (Cache)    │  │    API      │
     └─────────────┘  └─────────────┘  └─────────────┘
```

## API Documentation

### Chat Endpoints

```bash
# Create chat completion (streaming)
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "sessionId": "uuid",
  "stream": true
}
```

### Session Endpoints

```bash
# Create session
POST /api/sessions
Content-Type: application/json

{
  "title": "New Chat"
}

# List sessions
GET /api/sessions

# Get session
GET /api/sessions/:id
```

### Tool Endpoints

```bash
# List available tools
GET /api/tools

# Execute tool
POST /api/tools/execute
Content-Type: application/json

{
  "toolName": "file_read",
  "parameters": {"path": "/etc/hosts"}
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `file_read` | Read file contents from filesystem |
| `file_write` | Write content to files |
| `file_list` | List directory contents |
| `file_delete` | Delete files or directories |
| `web_search` | Search the web |
| `web_fetch` | Fetch URL content |
| `code_execute` | Execute code in sandbox |
| `data_transform` | Transform data formats |
| `data_query` | Query JSON data |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector URL | Optional |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_TOOLS` | Enable tool execution | true |
| `ENABLE_STREAMING` | Enable streaming responses | true |
| `ENABLE_MEMORY` | Enable session persistence | true |

## Development

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run typecheck
```

### Database Management

```bash
# Open Prisma Studio
npm run db:studio

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npm run db:migrate:reset

# Seed database
npm run db:seed
```

## Deployment

### Docker

```bash
# Build image
docker build -t ai-assistant:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e OPENAI_API_KEY=sk-... \
  ai-assistant:latest
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/

# Check status
kubectl get pods -l app=ai-assistant

# View logs
kubectl logs -l app=ai-assistant -f
```

### Helm

```bash
# Install with Helm
helm install ai-assistant infrastructure/kubernetes/helm/ai-assistant/
```

## Monitoring

### Health Endpoints

```bash
# Liveness probe
GET /health

# Readiness probe
GET /health/ready
```

### Metrics

Prometheus metrics available at port 9090.

### Dashboards

Grafana dashboards available at port 3001 (admin/admin).

## Security

- All endpoints require authentication (JWT or API key)
- Rate limiting enabled (100 requests/minute by default)
- Input validation with Zod schemas
- CORS configured for allowed origins
- Helmet security headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/your-org/ai-assistant-web/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/ai-assistant-web/discussions)
