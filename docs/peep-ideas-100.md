# 100 Peep Ideas for AI Startup Teams

*Target: 6-person AI startup building reliable agents for SMBs, aiming to scale.*

---

## Engineering & Development (1–10)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 1 | **EnvEditor** | `.env`, `.env.*` | Visual key-value editor with secret masking and diff from `.env.example` |
| 2 | **DockerCompose** | `docker-compose.yml`, `compose.yml` | Visual service graph showing containers, ports, volumes, and dependency chains |
| 3 | **Dockerfile** | `Dockerfile`, `Dockerfile.*` | Layered view of build stages with estimated layer sizes and best-practice hints |
| 4 | **PackageJSON** | `package.json` | Dependency dashboard with version staleness indicators and script runner |
| 5 | **Requirements** | `requirements.txt`, `pyproject.toml` | Python dependency viewer with CVE flags |
| 6 | **OpenAPI** | `openapi.yaml`, `swagger.json` | Interactive API explorer rendered from OpenAPI/Swagger specs |
| 7 | **GitLog** | `.git/` directory | Visual git history with branch graph and commit stats |
| 8 | **Makefile** | `Makefile` | Parsed target browser with dependency graph and inline docs |
| 9 | **CIConfig** | `.github/workflows/*.yml` | Visual CI pipeline graph with job dependencies and trigger conditions |
| 10 | **ErrorLog** | `*.log` | Structured log viewer with level filtering and pattern search |

## AI / ML Specific (11–20)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 11 | **PromptFile** | `*.prompt`, `*.prompt.md` | Prompt editor with variable highlighting, token counter, and inline test runner |
| 12 | **SystemPrompt** | `system.md`, `system-prompt.md` | System prompt viewer with section parsing and version diff |
| 13 | **EvalSet** | `*.eval.json`, `evals/*.json` | Evaluation dataset browser with pass/fail scoring and run comparison |
| 14 | **TrainingData** | `*.jsonl`, `dataset.jsonl` | JSONL dataset viewer with record browser and field stats |
| 15 | **AgentConfig** | `agent.yaml`, `*.agent.yml` | Agent config viewer showing tools, memory, routing, and guardrails |
| 16 | **ModelCard** | `model-card.md` | Structured model card renderer with performance tables and bias docs |
| 17 | **TokenBudget** | `*.prompt` + token heuristic | Token usage visualizer showing prompt vs context vs completion allocation |
| 18 | **RAGConfig** | `rag.yaml`, `retrieval.yaml` | RAG pipeline config viewer showing chunking, embedding, and retriever settings |
| 19 | **FineTuneJob** | `finetune.yaml`, `training_config.json` | Fine-tuning job config viewer with hyperparameters and dataset references |
| 20 | **BenchmarkResult** | `benchmark*.json` | Model benchmark viewer with metric comparisons and leaderboard ranking |

## Product & Design (21–30)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 21 | **PRD** | `prd.md`, `*-prd.md` | Product requirements renderer with linked user stories and acceptance criteria |
| 22 | **UserStory** | `*.story.md` | User story viewer with Gherkin-style scenarios and story points |
| 23 | **Wireframe** | `*.excalidraw`, `*.drawio` | Embedded canvas viewer for diagram files |
| 24 | **FigmaLink** | `*.figma.md` | Figma reference file that renders live embed previews |
| 25 | **UserFlow** | `*.flow.md` | Mermaid-powered user flow renderer with walkthrough mode |
| 26 | **FeatureFlag** | `flags.yaml`, `feature-flags.json` | Feature flag browser with environment toggle visualization |
| 27 | **Changelog** | `CHANGELOG.md` | Parsed changelog viewer with version timeline |
| 28 | **Roadmap** | `roadmap.md`, `roadmap.yaml` | Timeline view with quarters and status badges |
| 29 | **Personas** | `personas/*.md` | User persona cards with goals, frustrations, and JTBD |
| 30 | **CompetitorMatrix** | `competitive.md`, `competitor-matrix.csv` | Feature comparison matrix with win/loss cells |

## Data & Analytics (31–40)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 31 | **CSVTable** | `*.csv` | Sortable, filterable data table with column stats and basic charting |
| 32 | **JSONViewer** | `*.json` | Collapsible tree with search, path copy, and schema inference |
| 33 | **SQLFile** | `*.sql` | Syntax-highlighted SQL with query structure outline |
| 34 | **Notebook** | `*.ipynb` | Jupyter notebook renderer with cells, outputs, and charts |
| 35 | **MetricsConfig** | `metrics.yaml`, `kpis.yaml` | KPI definition viewer with formulas and owner tags |
| 36 | **TSVData** | `*.tsv` | Tab-separated data viewer |
| 37 | **ParquetPreview** | `*.parquet` | Schema, row count, and first N records preview |
| 38 | **DataSchema** | `*.schema.json`, `*.schema.yaml` | JSON Schema renderer with field tree and validation rules |
| 39 | **DashboardConfig** | `dashboard.yaml` | Analytics dashboard config with chart definitions and data sources |
| 40 | **ChurnReport** | `churn*.csv` | Churn analysis viewer with cohort table and trend sparklines |

## Sales & CRM (41–50)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 41 | **LeadList** | `leads.csv`, `prospects.csv` | Lead list with status badges, score bars, and owner assignment |
| 42 | **SalesScript** | `sales-script.md`, `call-script.md` | Call script renderer with collapsible objection-handling sections |
| 43 | **DealTracker** | `deals.csv`, `pipeline.csv` | Sales pipeline Kanban viewer grouped by deal stage |
| 44 | **Proposal** | `proposal-*.md` | Client proposal renderer with pricing table and scope sections |
| 45 | **ContactCard** | `contacts.csv`, `contacts.json` | Contact directory with search and vCard-style display |
| 46 | **Battlecard** | `battlecard-*.md` | Competitive battlecard with win themes and differentiators |
| 47 | **QuoteFile** | `quote-*.csv`, `*.quote.md` | Sales quote with line items and total calculation |
| 48 | **SalesDeck** | `sales-deck.md`, `deck-notes.md` | Speaker notes companion with slide-by-slide talking points |
| 49 | **ICP** | `icp.md` | Ideal customer profile card with firmographics and qualification checklist |
| 50 | **OutreachSeq** | `sequence-*.md`, `outreach/*.md` | Email/LinkedIn outreach sequence with step timeline |

## Marketing & Content (51–60)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 51 | **BlogDraft** | `posts/*.md`, `blog/*.md` | Blog editor with reading time, SEO metadata, and word count |
| 52 | **ContentCalendar** | `content-calendar.csv` | Calendar viewer with channel color-coding and publish timeline |
| 53 | **CopyDoc** | `copy/*.md`, `ad-copy-*.md` | Ad copy viewer with A/B variant labeling and character limits |
| 54 | **EmailTemplate** | `*.mjml`, `email-templates/*.html` | Email template preview with desktop/mobile toggle |
| 55 | **SEOKeywords** | `keywords.csv`, `seo-keywords.md` | Keyword list with volume, difficulty, and cluster grouping |
| 56 | **NewsletterDraft** | `newsletter-*.md` | Newsletter renderer with segment tags and CTA highlighting |
| 57 | **BrandGuide** | `brand.md`, `brand-guide.md` | Brand guideline viewer with color swatches and typography |
| 58 | **CaseStudy** | `case-study-*.md` | Case study renderer with outcome metrics and pull-quotes |
| 59 | **SocialPost** | `social/*.md` | Social post previewer simulating Twitter/LinkedIn layouts |
| 60 | **GTMPlan** | `gtm.md`, `go-to-market.md` | Go-to-market plan with channel table and launch checklist |

## Finance & Operations (61–70)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 61 | **Budget** | `budget.csv`, `budget-*.csv` | Budget viewer with category rollups and variance highlighting |
| 62 | **Runway** | `runway.csv`, `financials.csv` | Runway calculator showing months remaining with burn rate chart |
| 63 | **Invoice** | `invoice-*.md`, `invoice-*.csv` | Invoice renderer with line items, totals, and payment status |
| 64 | **Expenses** | `expenses.csv` | Expense report with category pie chart and reimbursement status |
| 65 | **CapTable** | `cap-table.csv`, `captable.csv` | Cap table viewer with ownership percentages and dilution modeling |
| 66 | **GrantTracker** | `grants.csv` | Funding tracker with deadline calendar and status pipeline |
| 67 | **VendorList** | `vendors.csv` | Vendor directory with contract dates, costs, and renewal flags |
| 68 | **SaaSStack** | `tools.md`, `saas-stack.csv` | SaaS subscription tracker with monthly costs and renewal dates |
| 69 | **P&LSnapshot** | `pnl.csv`, `profit-loss-*.csv` | P&L statement with revenue vs cost breakdown and sparklines |
| 70 | **OKRTracker** | `okrs.md`, `okrs.yaml` | OKR tree with progress bars and owner tags |

## HR & People (71–80)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 71 | **JobDesc** | `job-*.md`, `jd-*.md` | Job description renderer with requirements checklist and seniority badge |
| 72 | **OrgChart** | `org-chart.yaml`, `team.yaml` | Team org chart from YAML with reporting lines |
| 73 | **OnboardingDoc** | `onboarding.md` | Onboarding checklist with day/week/month phases and completion tracking |
| 74 | **ReviewTemplate** | `review-template.md` | Performance review form with rating scales and comment layout |
| 75 | **OfferLetter** | `offer-letter-*.md` | Offer letter renderer with compensation and equity breakdown |
| 76 | **PTOTracker** | `pto.csv`, `time-off.csv` | PTO balance tracker with calendar heat map |
| 77 | **TeamDirectory** | `team.csv`, `people.csv` | Team directory cards with roles, timezones, and contact links |
| 78 | **1on1Notes** | `1on1-*.md` | 1:1 notes viewer with action item extraction and topic trends |
| 79 | **LevelingGuide** | `levels.md`, `career-ladder.md` | Career ladder with skill matrix and level comparison |
| 80 | **CultureDoc** | `culture.md`, `values.md` | Culture and values renderer with principle cards |

## Legal & Compliance (81–90)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 81 | **Contract** | `contract-*.md`, `*.agreement.md` | Contract viewer with section nav, defined terms, and obligation list |
| 82 | **NDA** | `nda-*.md` | NDA viewer with party names, term dates, and restriction summary |
| 83 | **PrivacyPolicy** | `privacy-policy.md` | Privacy policy with data category table and retention schedule |
| 84 | **TermsOfService** | `terms.md`, `tos.md` | ToS viewer with clause navigator and plain-language summaries |
| 85 | **LicenseFile** | `LICENSE`, `LICENSE.md` | License renderer with SPDX identifier and permissions matrix |
| 86 | **ComplianceChecklist** | `compliance.md`, `*.compliance.yaml` | Compliance checklist with control status badges and evidence links |
| 87 | **DataProcessing** | `dpa.md` | DPA viewer with processor/controller roles and GDPR references |
| 88 | **IPRegister** | `ip-register.csv`, `trademarks.md` | IP register with filing dates, status, and renewal alerts |
| 89 | **RiskRegister** | `risk-register.csv`, `risks.yaml` | Risk matrix with likelihood/impact and mitigation status |
| 90 | **IncidentReport** | `incident-*.md`, `postmortem-*.md` | Incident viewer with timeline, root cause, and action items |

## Customer Success & Strategy (91–100)

| # | Name | Matches | Description |
|---|------|---------|-------------|
| 91 | **RunBook** | `runbook-*.md` | Operations runbook with step-by-step procedures and decision trees |
| 92 | **CustomerProfile** | `customer-*.md`, `accounts/*.md` | Account profile card with health score, usage notes, and renewal date |
| 93 | **SupportFAQ** | `faq.md`, `FAQ.md` | FAQ viewer with accordion and topic categories |
| 94 | **FeedbackLog** | `feedback.csv` | Customer feedback log with sentiment tagging and theme clustering |
| 95 | **OnboardingStatus** | `onboarding-status.csv` | Customer onboarding pipeline with milestone progress bars |
| 96 | **PlaybookDoc** | `playbook-*.md` | CS playbook with trigger conditions and action steps |
| 97 | **MeetingNotes** | `meetings/*.md`, `meeting-*.md` | Meeting notes with decision/action extraction and attendee list |
| 98 | **WeeklyUpdate** | `weekly-*.md`, `standup-*.md` | Weekly status with wins, blockers, and next-week goals |
| 99 | **StrategyDoc** | `strategy.md` | Strategy doc with vision/mission/goals hierarchy and initiative table |
| 100 | **PostMortem** | `retro-*.md`, `retrospective-*.md` | Retrospective viewer with went-well/delta columns and follow-up tracker |
