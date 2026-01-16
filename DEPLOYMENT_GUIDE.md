# AI Assistant Web - Deployment Guide

This guide provides step-by-step instructions for deploying the AI Assistant Web application to production.

## Prerequisites

Before you begin, ensure you have:

1. **GitHub Account** - For source control and CI/CD
2. **OpenAI API Key** - Get it from [OpenAI Platform](https://platform.openai.com/api-keys)
3. **Database** - PostgreSQL 15+ (local or cloud-hosted)
4. **Deployment Platform** - Netlify or Vercel account

## Option 1: Deploy to Netlify (Recommended)

### Step 1: Create GitHub Repository

```bash
# Navigate to project directory
cd ai-assistant-web

# Create repository at https://github.com/new
# Then add the remote and push:
git remote add origin https://github.com/YOUR_USERNAME/ai-assistant-web.git
git branch -M main
git push -u origin main
```

Or use the provided deployment script:

```bash
chmod +x deploy-github.sh
./deploy-github.sh
```

### Step 2: Connect to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Select your GitHub repository
4. Netlify will automatically detect Next.js and configure:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node.js version: 20

### Step 3: Configure Environment Variables

In Netlify dashboard, go to **Site Settings** > **Environment Variables** and add:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key (sk-...) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Random string (32+ chars) for JWT signing | Yes |
| `REDIS_URL` | Redis connection string (optional) | No |
| `NEXT_PUBLIC_APP_URL` | Your Netlify site URL | No |

Example `DATABASE_URL`:
```
postgresql://username:password@host:5432/database_name
```

### Step 4: Deploy

- **Automatic**: Push to main branch triggers deployment
- **Manual**: Netlify dashboard > Deploys > Trigger deploy

Your site will be available at: `https://your-site-name.netlify.app`

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl https://your-site.netlify.app/api/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

---

## Option 2: Deploy to Vercel

### Step 1: Create GitHub Repository

Same as Option 1.

### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Vercel will auto-detect Next.js settings

### Step 3: Configure Environment Variables

In Vercel dashboard, go to **Settings** > **Environment Variables** and add:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Random string for JWT signing | Yes |

### Step 4: Deploy

- **Automatic**: Push to main triggers deployment
- **Manual**: Vercel dashboard > Deploy > Deploy

Your site will be available at: `https://your-project.vercel.app`

---

## Option 3: Deploy with Docker

### Step 1: Build Docker Image

```bash
docker build -t ai-assistant-web:latest .
```

### Step 2: Run Container

```bash
docker run -p 3000:3000 \
  --name ai-assistant \
  -e OPENAI_API_KEY=sk-your-api-key \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-32-char-secret-key \
  ai-assistant-web:latest
```

### Step 4: Access Application

Visit `http://localhost:3000`

---

## Database Setup

### Using Supabase (Recommended for Production)

1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Get connection string from Settings > Database
4. Use in environment variables:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

### Using Neon

1. Create account at [Neon](https://neon.tech)
2. Create new project
3. Get connection string from Connection Details
4. Configure connection pooling if needed

### Run Migrations

After setting up DATABASE_URL, run:

```bash
npx prisma migrate deploy
```

---

## Environment Variables Reference

### Required Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-api-key-here

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database

# Security Configuration
JWT_SECRET=your-very-long-secret-string-here-at-least-32-characters
```

### Optional Variables

```bash
# Redis Configuration (caching)
REDIS_URL=redis://localhost:6379

# Application Settings
NEXT_PUBLIC_APP_URL=https://your-production-url.com
NODE_ENV=production

# Feature Flags
ENABLE_TOOLS=true
ENABLE_STREAMING=true
ENABLE_MEMORY=true

# OpenTelemetry (monitoring)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-collector.com
OTEL_SERVICE_NAME=ai-assistant-web
```

---

## Troubleshooting

### API Routes Return 404

**Cause**: Deployment platform not configured for Next.js SSR

**Solution**:
1. Ensure `netlify.toml` includes `@netlify/plugin-nextjs`
2. Verify build command is `npm run build`
3. Check environment variables are set

### Prisma Client Error

**Cause**: Database connection failed

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Run `npx prisma generate` during build
3. Ensure database is accessible from deployment environment

### OpenAI API Errors

**Cause**: Invalid or missing API key

**Solution**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has sufficient credits
3. Ensure no extra whitespace in environment variable

### Build Fails on TypeScript

**Cause**: Type errors in code

**Solution**:
1. Run `npm run typecheck` locally to identify errors
2. Fix all TypeScript errors before pushing
3. Ensure all imports are correct

### Session Not Persisting

**Cause**: Database not configured

**Solution**:
1. Verify PostgreSQL database is running
2. Check `DATABASE_URL` format
3. Run `npx prisma migrate status` to check migrations

---

## Monitoring & Maintenance

### Health Checks

- **Liveness**: `GET /api/health` - Returns if app is running
- **Readiness**: `GET /health/ready` - Returns if app is ready to serve traffic

### Logs

- **Netlify**: View in Dashboard > Deploys > Function logs
- **Vercel**: View in Dashboard > Functions
- **Docker**: `docker logs ai-assistant`

### Performance

- Monitor response times in deployment platform dashboard
- Check OpenAI API usage at [OpenAI Platform](https://platform.openai.com/usage)
- Review database query performance

---

## Security Checklist

- [ ] `OPENAI_API_KEY` stored securely (not in code)
- [ ] `DATABASE_URL` uses strong password
- [ ] `JWT_SECRET` is 32+ random characters
- [ ] Environment variables set in deployment platform, not code
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Input validation enabled

---

## Next Steps

1. **Custom Domain**: Configure custom domain in deployment platform
2. **SSL**: Automatic with Netlify/Vercel custom domains
3. **Analytics**: Enable analytics in deployment platform
4. **Monitoring**: Set up alerts for errors and performance

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/ai-assistant-web/issues)
- **Documentation**: See [README.md](README.md) for full documentation
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ai-assistant-web/discussions)
