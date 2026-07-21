---
name: research-todo-industry-standards
description: "Industry research on todo app tech stacks, device usage, feature lists, and styling — researched 2026-06-30"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 18f572f9-1aa5-4b4e-9d99-b8664e670184
---

## 1. Tech Stack — Industry Standards

### Most Common Frontend Frameworks (2024–2026)
- **React** — 39.5% professional adoption; dominant choice
- **Vue 3** — growing, faster time-to-market
- **Svelte 5** — #1 most admired (4 years running), best performance
- **Angular** — enterprise/large team standard

### Confirmed Stack for This Project
Next.js (React) + Tailwind CSS + shadcn/ui + PostgreSQL + Prisma + NextAuth + Vercel + AWS. This aligns with industry standards.

### Cost-Effective Hosting for Students
| Option | Cost | Notes |
|--------|------|-------|
| Vercel | $0 | Frontend, 100 GB bandwidth/month |
| Supabase | $0 | 500 MB PostgreSQL + Auth |
| Firebase | $0 | 10 GB Firestore + Auth |
| Railway | ~$1/month | Full-stack (frontend + backend + DB) |
| Render | $0–small | Static + Postgres free tier |

**Recommended**: Vercel (frontend) + Supabase (DB + Auth) = $0/month, or the project's existing Vercel + AWS approach.

---

## 2. Device Usage — Mobile vs Desktop

- **48% of users access task management software primarily via mobile** (smartphones/tablets)
- **59.99% of overall web traffic is mobile (2024)**
- **68% of office workers prefer desktop for focused work tasks**
- **72% of employees rely on desktop/laptop for work-related tasks**

### Interpretation
**Bimodal usage pattern**: mobile for quick task capture on-the-go; desktop for focused planning sessions. For a research study where participants use the app for 2 weeks as part of their daily routine, **responsive web (mobile + desktop) is sufficient** — no native app store required.

### Implication for This Project
The system is web-only (Next.js). It MUST be fully responsive. The store and petting zoo interactions need to work well on mobile since participants will likely check tasks on their phones throughout the day.

---

## 3. Feature List — Industry Standards

### Core/Essential (Every Todo App Has These)
- Create, edit, delete, complete/mark tasks
- Subtasks / nested tasks
- Due dates and deadlines
- Priority levels (high/medium/low)
- Search and filter
- Notifications/reminders
- Cross-device sync

### Standard Differentiating Features
- Recurring tasks
- Calendar view
- Natural language input for task creation
- Tags/labels/categories
- Task notes/descriptions
- Collaboration (assign tasks, comments)
- Multiple views: list, board (kanban), calendar, timeline

### Gamification Features (Relevant to This Project)
From apps like Habitica, Forest, Finch, Todoist:
- **Streaks** — consecutive day counters, visual indicators
- **XP/Points** — earned per task completion
- **Virtual currency** — spent in store/shop
- **Levels** — progression system tied to XP
- **Badges/achievements** — milestone rewards
- **Pet systems** — virtual creature that reacts to user activity
- **Shop/store** — purchasable cosmetics, accessories
- **Onboarding quests** — initial goals to ease new users in
- **Forgiving streak mechanics** — grace days, pause, weekend skip (modern trend away from harsh penalties)
- **Completion celebrations** — confetti, animations on task done

### Research/Admin Features (Specific to This Project)
- Admin telemetry dashboard: sessions, time in app, days returning, tasks completed
- Store telemetry: visits, items viewed vs purchased, time on store page
- A/B group assignment and isolation
- Data export for analysis

---

## 4. Styling — Industry Standards

### Color Schemes
**Light mode**: Clean white/off-white backgrounds, neutral grays, single brand accent color
**Dark mode** (increasingly standard):
| Element | Color |
|---------|-------|
| Background | #0D1117 or #121212 |
| Elevated surface | #1E1E1E |
| Border | #30363D |
| Text primary | #FAFAFA |
| Text secondary | #8B949E |
| Accent/interactive | #3B82F6 or #58A6FF |
| Success | #3FB950 |
| Warning | #D29922 |
| Danger | #F85149 |

### Layout Patterns
- **Sidebar navigation**: 240–280px fixed, always visible — used by Linear, Vercel, Notion
- **Task list**: Clean left-aligned list with checkbox, title, due date, priority badge
- **Card-based content**: Cards for store items, pet sanctuary items
- **Dashboard**: Sidebar + metric cards (4–6 KPIs) + CSS Grid content

### Typography
- **Font**: Sans-serif (Inter, Poppins, Roboto, or system fonts)
- **Heading**: 32–48px, weight 600–700
- **Body**: 14–16px, weight 400–500, line-height 1.4–1.6
- **Caption**: 12–14px

### Animation / Microinteractions
- Task completion: satisfying checkmark animation + optional confetti/celebration (800–1200ms)
- Streak milestones: highlight + counter animation
- Store purchase: visual confirmation + currency deduction animation
- Loading states: skeleton screens, not spinners

### Gamified UI Elements
- **XP bar**: Horizontal fill bar in header/profile area
- **Coin counter**: Circular coin icon + number, always visible in header
- **Pet display**: Central illustration in petting zoo; reacts to interaction
- **Shop grid**: 3–4 column grid of items with price badge, category filter
- **Achievement grid**: Locked/unlocked states with rarity color coding
- **Streak counter**: Prominent fire/streak icon + day number

### Accessibility
- WCAG AA minimum: 4.5:1 contrast ratio for text
- Color ≠ only signal (use icons + text alongside color)
- Keyboard navigation fully functional
- Focus states visible (2px minimum outline)
- Dark mode must independently pass contrast checks (desaturate accent colors ~20%)

### Design System Used in This Project
**shadcn/ui + Tailwind CSS** — matches industry standard. shadcn/ui components are copied into project (not npm-installed), giving full customization control. Built on Radix UI primitives for accessibility.

---

## Sources
- Research conducted 2026-06-30 via web search
- Apps analyzed: Todoist, TickTick, Microsoft To-Do, Things 3, Any.do, Google Tasks, Notion, Asana, Monday.com, Habitica, Forest, Finch, Streaks
- Usage stats: breeze.pm task management statistics 2026, research.com mobile vs desktop 2026
- Design: shadcn/ui docs, Material Design, ramotion.com, Trophy gamification blog
