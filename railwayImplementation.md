# BAND IT - Railway Deployment Specification

## Overview

Deploy Band It to Railway with three services:
- **PostgreSQL** - Database
- **API** - Node.js + tRPC backend
- **Web** - Next.js frontend

---

## Data Flow (Production)

```
User Browser
     ↓
Web Service (Next.js on Railway)
     ↓ API calls
API Service (Node.js on Railway)
     ↓ queries
PostgreSQL (Railway managed)
```

---

## Pre-Deployment Checklist

**READ/VERIFY BEFORE DEPLOYING:**

1. `apps/api/package.json` - check "start" and "build" scripts exist
2. `apps/web/package.json` - check "start" and "build" scripts exist
3. `apps/api/prisma/schema.prisma` - database schema ready
4. `.env.example` or existing `.env` - list of required environment variables
5. Any hardcoded `localhost` URLs that need to change for production

---

## Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to railway.app dashboard
2. Click "New Project"
3. Select "Empty Project"
4. Name it "band-it" or similar

### Step 2: Add PostgreSQL Database

1. In the project, click "New" → "Database" → "PostgreSQL"
2. Railway auto-provisions it
3. Click on the database service → "Variables" tab
4. Copy the `DATABASE_URL` - you'll need this

### Step 3: Deploy API Service

1. Click "New" → "GitHub Repo"
2. Select your band-it repository
3. Railway will detect it - configure:
   - **Root Directory:** `apps/api`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run start`
4. Go to "Variables" tab, add:
   ```
   DATABASE_URL=<paste from PostgreSQL service>
   JWT_SECRET=<generate a random string - 32+ characters>
   ANTHROPIC_API_KEY=<your Anthropic API key>
   NODE_ENV=production
   ```
5. Go to "Settings" → "Networking" → "Generate Domain" (get public URL)
6. Copy the API URL (e.g., `https://band-it-api-production.up.railway.app`)

### Step 4: Deploy Web Service

1. Click "New" → "GitHub Repo"
2. Select your band-it repository again
3. Configure:
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
4. Go to "Variables" tab, add:
   ```
   NEXT_PUBLIC_API_URL=<API URL from Step 3>
   NODE_ENV=production
   ```
5. Go to "Settings" → "Networking" → "Generate Domain"
6. This is your app URL (e.g., `https://band-it-web-production.up.railway.app`)

### Step 5: Run Database Migrations

1. Click on the API service
2. Go to "Settings" → "Deploy" → find the shell/CLI option
   OR use Railway CLI locally:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link  # select your project
   railway run npx prisma db push
   ```

---

## Environment Variables Summary

### API Service
| Variable | Value |
|----------|-------|
| DATABASE_URL | From Railway PostgreSQL (auto-linked if using Railway's reference) |
| JWT_SECRET | Random 32+ character string |
| ANTHROPIC_API_KEY | Your Anthropic API key |
| NODE_ENV | production |

### Web Service
| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_API_URL | Your API service URL |
| NODE_ENV | production |

---

## Connecting Services (Railway References)

Instead of copy-pasting DATABASE_URL, Railway can auto-link:

1. In API service → Variables
2. Click "Add Variable" → "Add Reference"
3. Select PostgreSQL → DATABASE_URL
4. Railway keeps it in sync automatically

---

## Verification Steps

After deployment, verify each layer:

### 1. Database
- Click PostgreSQL service → "Data" tab
- Should see your tables (or empty if migrations haven't run)

### 2. API
- Visit: `https://your-api-url.railway.app/health` (if you have a health endpoint)
- Or check Railway logs for "Server started" message

### 3. Web
- Visit: `https://your-web-url.railway.app`
- Should see login/home page
- Try to register/login

### 4. Full Flow
- Register a new user
- Create a band
- Check that data appears in database

---

## Common Issues

### "Cannot connect to database"
- Check DATABASE_URL is set correctly
- Make sure Prisma migrations ran

### "API calls failing from frontend"
- Check NEXT_PUBLIC_API_URL is correct
- Make sure it includes `https://`
- Check CORS settings in API if applicable

### "Build failing"
- Check Railway logs for specific error
- Usually missing dependency or wrong build command

### "Prisma schema out of sync"
- Run `railway run npx prisma db push` to sync schema

---

## File Changes Needed

Check these files for hardcoded localhost references:

1. **apps/web/src/lib/trpc.ts** or similar - API URL config
   - Should use `process.env.NEXT_PUBLIC_API_URL` or similar

2. **apps/api/src/index.ts** - CORS origins
   - Should allow your Railway web URL

3. **apps/api/src/lib/prisma.ts** - should use DATABASE_URL env var (likely already does)

---

## For Claude Code

**Before implementing:**

1. Read `apps/api/package.json` and `apps/web/package.json` to understand build/start scripts
2. Search codebase for `localhost` to find hardcoded URLs
3. Check how API URL is configured in the frontend
4. Check CORS configuration in the API

**Then guide Bardia through Railway dashboard steps and make any code changes needed.**

---

## Post-Deployment

Once working:
- Share the web URL with your team
- They can register and start using Band It
- Monitor Railway dashboard for any errors

---

## Cost Estimate

| Service | Estimated Cost |
|---------|---------------|
| PostgreSQL | ~$5-7/month |
| API | ~$5/month |
| Web | ~$5/month |
| **Total** | **~$15-20/month** |

Railway charges based on usage. With 10 users, should be minimal.