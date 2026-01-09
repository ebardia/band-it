# Band IT

Decentralized governance platform for bands and collectives.

## Architecture

- **Monorepo:** Turborepo
- **Frontend:** Next.js 14 + TypeScript + Tailwind
- **Backend:** Node.js + tRPC + Prisma
- **Database:** PostgreSQL (Neon)
- **Deployment:** Vercel (frontend) + Railway (backend)

## Getting Started
```bash
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build for production
pnpm build
```

## Project Structure
```
band-it/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # tRPC backend
├── packages/
│   └── shared/       # Shared types & schemas
```

## Phase 0 Features

- User authentication (JWT + refresh tokens)
- Band creation & management
- Member roles & permissions
- Proposal system
- Task management
- Stripe subscriptions