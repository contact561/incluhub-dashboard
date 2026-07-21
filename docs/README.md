# IncluHub documentation index

Use this page to find the right doc. Active references stay at the top; historical
delivery reports live under `archive/`.

## Start here

| Doc | Purpose |
|-----|---------|
| [../README.md](../README.md) | Clone, env, run, and verify the app |
| [PROJECT_RULES.md](PROJECT_RULES.md) | MVP constraints and engineering rules |
| [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md) | What is built, migration notes, changelog |

## Product and architecture (active)

| Doc | Purpose |
|-----|---------|
| [Product_Master.md](Product_Master.md) | Product scope and roles |
| [User_Flows.md](User_Flows.md) | End-to-end user journeys |
| [Screen_Structure.md](Screen_Structure.md) | Screen inventory and IA |
| [Architecture_Plan.md](Architecture_Plan.md) | System architecture |
| [Database_Plan.md](Database_Plan.md) | Schema and data model reference |

## Operations and release

| Doc | Purpose |
|-----|---------|
| [audits/DATABASE_REGISTRY.md](audits/DATABASE_REGISTRY.md) | Tables, RPCs, and DB assets |
| [audits/FEATURE_REGISTRY.md](audits/FEATURE_REGISTRY.md) | Feature-to-code map |
| [audits/ROUTE_REGISTRY.md](audits/ROUTE_REGISTRY.md) | App routes by role |
| [audits/DEPLOYMENT_READINESS.md](audits/DEPLOYMENT_READINESS.md) | Deployment gates |
| [releases/PACKAGE_F_RELEASE_READINESS.md](releases/PACKAGE_F_RELEASE_READINESS.md) | Package F release checklist |

## Design (active)

| Doc | Purpose |
|-----|---------|
| [design/BRAND_REQUIREMENTS.md](design/BRAND_REQUIREMENTS.md) | Brand and visual requirements |
| [design/DESIGN_TOKEN_PLAN.md](design/DESIGN_TOKEN_PLAN.md) | Design tokens |
| [design/ROLE_SCREEN_INVENTORY.md](design/ROLE_SCREEN_INVENTORY.md) | Screens by role |
| [design/UI_IMPLEMENTATION_PLAN.md](design/UI_IMPLEMENTATION_PLAN.md) | UI delivery plan |

## Database setup

See [../supabase/README.md](../supabase/README.md) for migrations and policies.

### Migration ranges

| Branch track | Migrations |
|--------------|------------|
| Package F (`master`) | `001`–`013` |
| Founder workflows (`feat/local-dev`) | `014`–`022` (notifications, Stage 3 QR, Stage 5) |

## Archive (historical — not primary onboarding)

| Folder | Contents |
|--------|----------|
| [archive/](archive/) | Handoff notes and point-in-time status |
| [archive/audits/](archive/audits/) | Full system audit snapshots |
| [archive/releases/](archive/releases/) | Package E/E1 planning and validation |
| [archive/qa/](archive/qa/) | UI portal QA verification records |
