---
name: project-imy761-overview
description: Full context for IMY761 research project — gamified todo app studying false urgency dark patterns
metadata: 
  node_type: memory
  type: project
  originSessionId: 18f572f9-1aa5-4b4e-9d99-b8664e670184
---

## Research Question
"How does the implementation of false urgency in gamified productivity tools shape general user perceptions of the application?"

## System Design
A gamified to-do application with three modules:
- **TODO App**: Task management where completing tasks earns in-game currency (coins). Currency is dynamically tied to task size (user-set) + time. Efficiency bonus for early completion; lateness penalty deducts coins daily.
- **Store (Storefront)**: Virtual shop where users spend earned coins on items for their pet sanctuary. THIS is where false urgency dark patterns are applied for the experimental group (Group B).
- **Petting Zoo**: Virtual pet sanctuary — animals can be viewed, petted, fed, and customized with accessories bought from the store.

## Research Design
- **Between-subjects A/B test**: Group A (control, no dark patterns) vs Group B (experimental, false urgency in store)
- **False urgency patterns**: "Only X left!", "5 people have this in cart", countdown timers, limited-time offers
- **Study period**: 2 weeks (20/09/2026 – 10/10/2026)
- **Sample**: 20 participants (university students + working professionals, 18–45)
- **Dependent variables**: User trust (McKnight 2002), perceived fairness (Colquitt 2001), continued-usage intention (UTAUT)
- **Telemetry**: Sessions per user, time in app, days returning, tasks completed, store visits, items viewed vs purchased, time on store page

## Tech Stack (Confirmed in D3)
- **Frontend/Backend**: Next.js (full-stack, React-based)
- **Styling**: Tailwind CSS + shadcn/ui
- **A/B assignment**: Next.js Middleware
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth + JWT
- **AI (telemetry insights)**: OpenAI
- **Deployment**: Vercel (frontend) + AWS via Docker (backend)

## Key Constraints
- Cost-effectiveness is paramount (student project)
- Beta system due: **2026-07-11** (~11 days from 2026-06-30)
- Beta testing: 2026-07-12 to 2026-07-18
- Final system: **2026-09-14**
- Ethics clearance required before data collection

## Guardrails (non-functional)
- Anti-spam: repeated identical tasks yield diminishing returns / flagged as grinding
- Rewards proportional to task effort and time
- Telemetry: all events logged client-side, stored server-side securely

**Why:** This informs all feature prioritization — the app is a research instrument, not a consumer product. Features that don't serve the study's independent/dependent variables are lower priority.
