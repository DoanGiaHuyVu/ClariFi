# ClariFi 🪙

> **Ton argent, clarifié. — Your money, clarified.**

ClariFi is a bilingual (French/English) AI-powered budgeting app built for the Quebec market. It combines an intelligent budget coach powered by OpenAI and CopilotKit, gamified savings goals, and CAD-native financial tracking — all in a single web app.

Built for the **[Hackathon Name]** challenge: *Add new features, redesign the UI, integrate external APIs, and develop a business model for a budgeting app.*

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [How the AI Coach Works](#how-the-ai-coach-works)
- [Business Model](#business-model)
- [Team](#team)

---

## The Problem

We analyzed **283 user reviews** of the original budgeting app and found three categories of issues:

**Critical bugs (drove 47% of 1–2 star reviews):**
- Sort by amount was alphabetical — `$1,000` appeared before `$5`
- Search results lost their CSS styling and delete buttons
- Category summary used `Math.abs()`, so income and expenses were added together

**Top missing features:**
- No transaction dates (~50 mentions)
- No way to edit transactions (~45 mentions)
- No charts or visual breakdowns (~45 mentions)
- No CSV export (~25 mentions)
- No French language support (~15 mentions)

**The market gap Forbes confirmed:**
Every app in [Forbes Advisor Canada's top 10 for 2026](https://www.forbes.com/advisor/ca/banking/best-budgeting-apps/) is American, billed in USD, and has known connectivity issues with Canadian financial institutions. Total Canadian non-mortgage consumer debt reached **$21,931 per person** in 2024 (Equifax). The **8.5 million Quebec residents** are underserved by every app on that list.

---

## Our Solution

ClariFi is the first CAD-native, bilingual budgeting app built specifically for Quebec. We fixed every reported bug, implemented the top-requested features, and layered on three differentiating pillars:

| Pillar | What it means |
|---|---|
| 🤖 AI Budget Coach | OpenAI-powered coach that reads your real transaction data, answers questions in FR or EN, and takes actions directly in the app via CopilotKit |
| 🇫🇷 Quebec-First | Full French/English toggle, CAD as default currency, Quebec-specific categories (STM, Hydro-Québec, RAMQ, Provigo/IGA), real-time CAD exchange rates |
| 🎮 Gamified Goals | Savings goals with XP, streaks, badges, leaderboard, and confetti — making budgeting feel like progress, not punishment |

---

## Features

### Core features (free tier)
- **Dashboard** — balance, safe-to-spend, income vs expenses, category pie chart, spending evolution, active goal previews
- **Transaction search & filter** — find transactions by description; filter by week/month/year
- **Per-category progress bars** — budgeted vs. spent vs. remaining, three-segment visual per category
- **Recurring transactions** — mark any transaction as recurring (weekly/monthly); auto-populated on schedule
- **Savings goals** — set a goal name, target amount, target date, and emoji; track progress with a visual bar
- **XP + level system** — earn XP for logging transactions, staying under budget, hitting goals
- **Badges** — First Transaction, Goal Crusher, 7-Day Streak, Under Budget, Épargne Champion
- **FR/EN toggle** — full i18n with instant language switch; auto-detects `fr-CA` browser locale
- **CAD-native** — Canadian dollar formatting throughout; no USD conversion headaches
- **Quebec categories** — Épicerie, Loyer, STM / Transport, Hydro-Québec, RAMQ / Santé, Divertissement, Épargne
- **CSV export** — download all transactions as a spreadsheet using PapaParse
- **Dark mode** — full dark mode toggle with Tailwind `dark:` classes
- **Duplicate charge detection** — flags when the same description + amount appears twice within 7 days
- **Budget carry-forward** — leftover monthly budget rolls into next month instead of resetting
- **"Safe to spend" indicator** — income minus bills minus savings contributions = amount available today

### AI features (Pro tier — $4.99 CAD/month)
- **AI auto-categorization** — as you type a transaction description, AI suggests the category ("McDonald's" → Restaurants, "STM" → Transport)
- **Natural language Q&A** — ask anything about your finances in French or English ("Combien j'ai dépensé en épicerie ce mois-ci?")
- **CopilotKit actions** — the AI doesn't just suggest, it executes: add transactions, create goals, set budget alerts, all from the chat
- **Spending pattern alerts** — proactive warnings when a category approaches its budget limit
- **Month-end forecast** — projects end-of-month spending: `(spent so far ÷ day of month) × days in month`
- **Personalized weekly challenges** — Gamified challenges based on your actual patterns ("Under $150 on dining this week — earn 75 XP")
- **Subscription audit** — flags recurring charges you haven't used in 90+ days
- **Net worth tracker** — assets minus liabilities = net worth, with 5-year projection chart
- **Debt payoff calculator** — avalanche or snowball strategy; shows payoff date and total interest

### Real-time data integrations
- **Bank of Canada Valet API** — official CAD/USD rate feed (free, no auth required)

---

## Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| Next.js 16 (App Router) | Full-stack framework; API routes host the CopilotKit runtime |
| TypeScript | Type safety across the entire codebase |
| Tailwind CSS v4 | Utility-first styling with dark mode support |
| shadcn/ui | Accessible UI components (Dialog, Badge, Progress, Select) |
| Recharts | Pie chart, line chart, and bar chart for spending visualizations |
| Framer Motion | Animations for XP bar fills, badge unlocks, and goal celebrations |
| Lucide React | Icon library |
| Zustand + persist | Global state with localStorage persistence |
| React Hook Form + Zod | Form validation for transaction and goal creation |

### Internationalization
| Package | Purpose |
|---|---|
| i18next | Core i18n library |
| react-i18next | `useTranslation()` hook for all components |
| i18next-browser-languagedetector | Auto-detects `fr-CA` browser locale; defaults to French |

### AI & CopilotKit
| Package | Purpose |
|---|---|
| `@copilotkit/react-core` | `useCopilotReadable()` exposes financial data to AI; `useCopilotAction()` lets AI modify app state |
| `@copilotkit/react-ui` | Pre-built `CopilotPopup` and `CopilotSidebar` chat components |
| `@copilotkit/runtime` | Self-hosted backend that routes CopilotKit requests to the AI provider |
| `openai` | OpenAI API client (`gpt-5-nano`) |

### Data & Utilities
| Package | Purpose |
|---|---|
| date-fns | Date formatting, month filtering, streak calculation |
| PapaParse | CSV export |
| jsPDF + jspdf-autotable | PDF export for monthly reports |
| canvas-confetti | Celebration animation when a savings goal is completed |

---

## Project Structure

```
clarifi/
├── app/
│   ├── api/
│   │   └── copilotkit/
│   │       └── route.ts          # CopilotKit runtime — connects to OpenAI API
│   ├── layout.tsx                # CopilotKit provider wraps the entire app
│   └── page.tsx                  # Main Dashboard with all tabs (Transactions, Goals, Coach, Assets, Settings)
│
├── components/
│   ├── ClientProviders.tsx       # I18n and CopilotKit client-side setup
│   └── ui/                       # shadcn/ui and custom components
│       ├── Dashboard.tsx         # Balance, safe-to-spend, pie chart, forecast
│       ├── AddTransaction.tsx    # Form + useCopilotAction for addTransaction
│       ├── Goals.tsx             # Goal creation, progress bars, confetti
│       ├── AssetsAndLiabilities.tsx # Net worth tracker
│       └── LanguageToggle.tsx    # FR/EN switcher
│
├── lib/
│   ├── store.ts                  # Zustand store: transactions, goals, XP, badges
│   ├── export.ts                 # CSV and PDF export utilities
│   ├── currency.ts               # Bank of Canada API calls
│   └── i18n.ts                   # i18next initialization
│
├── locales/
│   ├── en.json                   # English translations
│   └── fr.json                   # French translations (default for Quebec)
│
├── .env                          # API keys (not committed)
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- An OpenAI API key

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-team/clarifi
cd clarifi

# 2. Install dependencies
npm install

# 3. Set up environment variables (see next section)
cp .env.example .env
# Then edit .env and add your OPENAI_API_KEY

# 4. Start the development server
npm run dev

# 5. Open the app
# http://localhost:3000
```

The app runs entirely locally. No database setup is required — all data persists in `localStorage` by default.

### Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env` file in the project root with the following:

```env
# Required
OPENAI_API_KEY=sk-...
```

The Bank of Canada exchange rate API is free and requires no authentication.

---

## How the AI Coach Works

The AI coach is built on the same architecture as an autonomous agent loop. If you've seen `agent.py` in this repo, the budget coach maps directly:

| Role | Budget coach equivalent |
|---|---|
| Financial state | Income, expenses, savings rate, streaks |
| Interactions | CopilotKit actions (`addTransaction`, `createGoal`, `completeChallenge`) |

### The three trigger modes

**1. User types in chat (synchronous)**
The `CopilotPopup` or `CopilotChat` is open. User asks "How much did I spend on food this month?" — `useCopilotReadable` has already exposed all transactions to the AI, so it answers immediately with real numbers.

**2. New transaction added (reactive)**
User logs a transaction. The system can check if this pushes any category over its budget and provide immediate feedback.

### CopilotKit actions available to the AI

| Action | What it does |
|---|---|
| `addTransaction` | Logs a transaction when the user describes spending in natural language |
| `createGoal` | Creates a savings goal based on spending pattern analysis |
| `setBudgetAlert` | Sets a spending limit and alert threshold for a category |
| `createChallenge` | Generates a gamified weekly challenge with an XP reward |
| `flagSubscription` | Marks a recurring charge as potentially unused |

### The bilingual system prompt

The CopilotKit runtime at `/api/copilotkit/route.ts` injects instructions that make the AI behave as a Quebec-aware budget coach:

- Always responds in the same language the user writes in (FR or EN)
- Uses CAD currency throughout
- Knows Quebec-specific context: STM pass, Hydro-Québec seasonal billing, RAMQ contributions
- Is warm and encouraging — like a knowledgeable friend, not a financial advisor

---

## Business Model

### Target market
Montreal and Quebec residents aged 18–35, bilingual or French-speaking, who are underserved by every existing budgeting app due to language barriers, USD pricing, and lack of local context.

**Market size:** 8.5M Quebec residents × ~40% in the 18–40 target age band = ~3.4M addressable users. At 1% conversion to paid: ~34,000 Pro subscribers.

### Pricing

| Tier | Price | What's included |
|---|---|---|
| Free | $0 | All bug fixes, dashboard, transactions, dates, edit, goals, XP, badges, FR/EN toggle, CAD currency, Quebec categories, CSV export, recurring transactions, currency conversion |
| Pro | $4.99 CAD/month | Everything in Free + AI auto-categorization, budget chat, spending insights, forecasting, AI weekly challenges, net worth tracker, debt payoff planner, 5-year projection, receipt storage, PDF export, unlimited goals |

### Unique value proposition

> The only bilingual CAD-native budgeting app with an AI coach that understands Quebec — no USD pricing, no connectivity issues with Canadian banks, and no app that treats "Hydro" and "RAMQ" as unknown categories.

### Why no existing app solves this

Forbes Advisor Canada's 2026 rankings confirm it: every top-10 app is American, billed in USD, and requires Canadian users to pay a 10–15% currency surcharge on top of bank connectivity issues. ClariFi is built from the ground up for CAD and Quebec — the market exists and is explicitly documented as unserved.

### Go-to-market

1. **Launch on Product Hunt** with a Quebec-specific angle ("Finally a budgeting app that knows what STM is")
2. **Student partnerships** — UQAM, Concordia, McGill student associations; free Pro for one year with `.edu` email
3. **Content marketing in FR** — TikTok/Instagram targeting "comment gérer son budget Montréal" keywords
4. **Local fintech community** — FinTech Québec, Notman House, Montreal startup events
5. **Referral program** — invite a friend, both get 2 months Pro free

---

## Team

| Name | Role |
|---|---|
| [Name] | Product & Business |
| [Name] | Frontend (React, UI/UX) |
| [Name] | AI / CopilotKit integration |
| [Name] | Backend & data |

---

## Acknowledgements

- **CopilotKit** — for the AI action framework that makes the budget coach interactive
- **Bank of Canada Valet API** — official CAD/USD rates
- **Forbes Advisor Canada** — their 2026 rankings documented exactly the market gap we're solving

---

*ClariFi — Ton argent, clarifié.*