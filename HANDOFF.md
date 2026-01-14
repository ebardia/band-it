Band-It Development Handoff
Last Updated: January 13, 2026
Current State
The app has: Users → Bands → Proposals (with voting) → Projects (with AI suggestions) → Tasks (with verification)
Recently Completed

Tasks feature with full verification flow
AI validation for proposals, projects, tasks
Project detail page refactored into components

Next Up (In Order)

File uploads for task proof/receipts
AI task suggestions
Members page
User dashboard improvements

Key Architecture
Backend (apps/api/)

Prisma schema: prisma/schema.prisma
Routers: src/server/routers/ (auth, band, proposal, project, task, ai)
Services: src/services/ (notification, ai-validation)

Frontend (apps/web/)

Pages: src/app/bands/[slug]/ (proposals, projects, tasks)
UI Components: src/components/ui/
Project detail components: src/app/bands/[slug]/projects/[projectId]/components/

Database

PostgreSQL via Supabase
Prisma ORM

Tech Stack

Monorepo (pnpm workspaces)
API: Express + tRPC
Web: Next.js 14 + React
AI: Anthropic Claude API

Transcript Location
/mnt/transcripts/ - Contains full conversation history if details needed

other comments: all web pages must follow a theme, we have developed a theme structure; no html code should be in page.tsx files; 
when you want to change a file, always ask for the existing one before changing it
always give me the fill file instead of asking me to copy paste sections of a file
