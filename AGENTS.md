# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Botdoc Reports — engineering conventions

This repository hosts **two products** in a single Next.js application, Docker
image, and Kubernetes deployment:

| Product | URL prefix | Domain entities | Fabric provider |
|---------|-----------|-----------------|-----------------|
| **Botdoc Connect** | `/` (root) | Customer | `FabricMetricsProvider` |
| **Botdoc Lite KPA** | `/lite` | Partner | `LiteMetricsProvider` |

Both products share auth, design system, database, Fabric connection, and
infrastructure. Product-specific code is isolated by route group and by
domain module.

## Product map

```
src/app/
  login/                  ← Shared (single password, single session)
  (connect)/              ← Route group, no URL prefix → serves /
    customers/[id]/...    ← Connect reports, email scheduling
    emails/               ← Global email log
  (lite)/lite/            ← Route group + URL segment → serves /lite/...
    partners/[id]/...     ← Lite KPA reports
  api/
    admin/                ← Connect health-check / discovery endpoints
    cron/send-emails/     ← Connect scheduled email dispatch
    partners/[id]/employees/  ← Lite employee data
```

## Domain-Driven Design (DDD)

Organize code by **domain**, not by file type. Keep business rules out of React
components and out of infrastructure code.

```
src/domain/          Pure business logic + interfaces. No framework/IO imports.
  shared/              DataFilter — unified filter type used by both products
  customer/            Customer entity + CustomerRepository interface (Connect)
  partner/             Partner entity + PartnerRepository interface (Lite)
  email/               Email scheduling types (Connect)
  metrics/             MetricsProvider interface (shared)
  report/              Report entity (Connect)
src/infrastructure/  Implementations of domain interfaces (talk to the outside world).
  db/                  Postgres repositories (Drizzle) — both products share one DB
  fabric/              FabricMetricsProvider (Connect) + LiteMetricsProvider (Lite)
  email/               MailgunEmailService (Connect)
src/design/          The design system (tokens + reusable UI primitives) — shared.
src/components/      Presentational React components.
  Dashboard.tsx        Connect report canvas
  LiteDashboard.tsx    Lite report canvas
  Sidebar.tsx          Connect sidebar
  LiteSidebar.tsx      Lite sidebar
  TrendsSection.tsx    Connect trends
  LiteTrendsSection.tsx  Lite trends
  (others)             Shared or product-specific (see file headers)
src/app/             Next.js routes — product-specific under route groups.
```

Rules:
- **Depend on interfaces, not implementations.** UI, PDF, and the cron job all
  consume the domain model via `MetricsProvider` — they never know whether data
  came from CSV or Fabric. Swapping the source is one new class in
  `infrastructure/`, nothing downstream changes.
- **Domain layer is pure.** No `next/*`, no DB driver, no `fetch` inside `src/domain`.
- **Validate at the boundary** (form input, Fabric rows, env vars), then trust the
  domain model internally.
- **Product isolation in routes.** Connect routes live in `(connect)/`, Lite routes
  in `(lite)/lite/`. Never import a Connect route file from Lite or vice versa.
  Shared code goes in `src/lib/`, `src/components/`, or `src/design/`.

## Don't Repeat Yourself (DRY)

- **Never hard-code colors, shadows, radii, fonts, or spacing.** Import them from
  `@/design` tokens (`color`, `radius`, `shadow`, `font`, `status`, `trendColor`).
  A raw hex like `#0A1628` or a copy-pasted `box-shadow` string in a component is a
  bug — add/extend a token instead.
- **Reuse UI primitives** from `@/design` (`Card`, `CardHeader`, `KpiCard`, `Badge`,
  `Button`, `BrandMark`, `FieldLabel`, `TextInput`, `Select`, `FileDrop`). If you
  find yourself repeating a styled block, promote it to a design-system component.
- **One source of truth per concept.** Business formulas (e.g. usage score) live in
  the domain layer and are imported, never re-implemented in a component.

## Design system

`src/design/` is the only place visual styling decisions are defined.
- `tokens.ts` — the palette and scales. Change a brand color here and it updates
  everywhere.
- `components/` — presentational, prop-driven primitives. Keep them free of
  `'use client'` and business logic so they render in both server and client
  contexts (this matters for server-side PDF rendering).
- Import everything from the barrel: `import { Card, color } from '@/design'`.

## Database

This app uses **Drizzle ORM** with a **single PostgreSQL database** (`botdoc_reports`)
and a single `botdoc` schema containing tables for both products:

| Table | Product | Purpose |
|-------|---------|---------|
| `partners` | Lite | Partner/dealer group records |
| `customers` | Connect | Customer/dealership records |
| `recipients` | Connect | Email contact list |
| `email_schedules` | Connect | Recurring email jobs |
| `email_log` | Connect | Email audit trail |
| `reports` | Connect | Report snapshots |

**Migration rules — read before touching any database code:**

- **Never alter the database manually.** All schema changes must go through a migration file.
- **Never edit or delete an existing migration file** after it has been committed.
- **Always generate a migration when you change the schema:**
  ```bash
  bun run db:generate
  ```
- **Migrations run automatically on deploy** via `instrumentation.ts`.
- **Test locally before pushing:** `bun run db:migrate`

## Quality gates

Before considering a change done, all three must pass:

```bash
npx tsc --noEmit          # types
npx eslint src --max-warnings=0   # lint
npx next build            # production build
```

## CronJob (scheduled emails)

The send-emails CLI script (`scripts/send-emails.ts`) is bundled into
`cron/send-emails.js` during Docker build. The K8s CronJob runs it directly
via the app container image — no HTTP call or auth token needed.

```bash
# Dev:
bun run send-emails

# K8s CronJob command:
["node", "cron/send-emails.js"]
```
