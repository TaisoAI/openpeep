# Business Peeps — Priority Build Order

OpenPeep needs a suite of business-operations peeps beyond the existing creator-focused tools. Purpose-built JSON editors for common business documents — offline-first, git-versioned, file-based.

## Tier 1 — High Impact, Low Complexity (Build First)

Used daily/weekly by nearly everyone. Straightforward data models.

| # | Peep | Description | Complexity |
|---|------|-------------|------------|
| 1 | **Meeting Notes** | Structured minutes — attendees, agenda, decisions, action items with owners/due dates. Templates: standup, 1:1, all-hands, retro | Low |
| 2 | **Weekly Report** | Status update — accomplishments, blockers, next week plan. Supports team rollup | Low |
| 3 | **Mermaid Diagram** | Visual editor for Mermaid.js — flowcharts, sequence, class, ERD. Live preview + code edit | Medium |
| 4 | **Project Plan / Kanban** | Tasks with status columns, assignees, dates, dependencies. Board + list view | Medium |

## Tier 2 — High Impact, Medium Complexity

Monthly use or specific business functions. More complex data models.

| # | Peep | Description | Complexity |
|---|------|-------------|------------|
| 5 | **Monthly Report** | Aggregates weekly reports + KPIs + narrative. Trend charts | Medium |
| 6 | **Budget Tracker** | Line-item budget — categories, planned vs actual, variance highlighting | Medium |
| 7 | **Org Chart** | Interactive hierarchy — drag to reorganize, headcount by dept, vacancy tracking | Medium |
| 8 | **Invoice** | Line items, tax, totals, payment terms. PDF export | Medium |

## Tier 3 — High Impact, High Complexity

Strategic/financial tools. Complex calculations and visualizations.

| # | Peep | Description | Complexity |
|---|------|-------------|------------|
| 9 | **P&L Statement** | Income statement — revenue, COGS, margins, OpEx, net income. Period comparison | High |
| 10 | **Revenue Projection** | Forecast model — assumptions, growth rates, scenario comparison (bear/base/bull). Charts | High |
| 11 | **Annual Plan** | Goals, OKRs, milestones, resource allocation. Quarterly breakdown + progress tracking | High |
| 12 | **Expense Report** | Receipt tracking, categories, approval status, reimbursement totals | Medium |

## Tier 4 — Product Development (Dogfood)

Tools our product team uses directly.

| # | Peep | Description | Complexity |
|---|------|-------------|------------|
| 13 | **Product Brief** | Problem statement, target user, success metrics, scope, constraints | Low |
| 14 | **Feature List** | Prioritized feature backlog — name, description, status, effort, impact score. Sortable/filterable | Low |
| 15 | **Brand Guidelines** | Colors, typography, logo usage, voice & tone, do's/don'ts. Visual swatches + examples | Medium |
| 16 | **Mood Board** | Visual inspiration collector — images, color palettes, typography samples, reference links. Grid layout | Medium |
| 17 | **User Feedback Log** | Structured feedback — source, quote, category, sentiment, linked feature. Aggregation view | Low |

## Tier 5 — Specialized / Infrastructure

Valuable but used by specific roles or less frequently.

| # | Peep | Description | Complexity |
|---|------|-------------|------------|
| 18 | **Network Diagram** | Visual network topology — nodes, connections, subnets, firewall rules | High |
| 19 | **Hiring / Job Req** | Job description, requirements, interview plan, candidate scorecard | Low |
| 20 | **Headcount Plan** | Dept staffing — current, planned, open roles, compensation bands, total cost | Medium |
| 21 | **Compensation Plan** | Salary bands, equity, bonus structure, total comp modeling | High |
| 22 | **Roadmap** | Timeline view of initiatives across quarters. Swimlanes by team/theme | Medium |

## Recommended Build Order

1. **Meeting Notes** — simplest, most universal, proves the pattern
2. **Weekly Report** — builds on meeting notes pattern, high frequency use
3. **Mermaid Diagram** — visual wow factor, leverages existing library
4. **Project Plan** — core business tool, medium complexity
5. **Product Brief** — low complexity, team uses it immediately
6. **Feature List** — low complexity, pairs with product brief
7. Then proceed through Tier 2 → Tier 3 → Tier 4 → Tier 5
