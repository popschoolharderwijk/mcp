# Mplifi Community Portal

Web app for running a music school: students and teachers, lesson agreements, a recurring-lesson agenda, projects, Stripe direct debit for tuition, email templates, and hours/financial reporting.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, `react-icons/lu`
- **Backend**: Supabase (Auth, Postgres + RLS, Edge Functions on Deno)
- **Payments**: Stripe (SEPA Direct Debit via iDEAL setup)
- **Email**: Resend (custom SMTP for Supabase Auth + transactional templates)
- **Testing**: Bun test runner (unit + RLS against remote Supabase preview branches)
- **Linting/format**: Biome
- **CI/CD**: GitHub Actions + Supabase GitHub Integration (branching)

## Core features

- Passwordless sign-in via Magic Link (OTP) — no passwords in production.
- Lesson agreements with age-based rates (<21 / 21+), weekly/biweekly cadence, no-lesson periods with **shift logic** (lessons shift forward; August stays a pause).
- Agenda with recurring events, deviations, cancellations (teacher vs student) and multi-participant projects.
- Stripe SEPA direct debit per lesson agreement: setup via iDEAL, then a monthly `SubscriptionSchedule` over 11 months.
- Database-backed email templates with inline preview and test send.
- Projects (domain → label → project), polymorphic agenda linking, cost centre.
- Hours/accounting reports with VAT by age category and lesson date.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server (against the mcp-dev Supabase project)
bun dev

# Run tests
bun test --bail
```

> ℹ️ On Windows, `bun install` can fail with esbuild — use `npm install` for the first install, then `bun dev`.

## Documentation

| Topic | File |
|-------|------|
| Architecture & data model | [docs/architecture.md](docs/architecture.md) |
| Supabase server setup | [docs/supabase-setup.md](docs/supabase-setup.md) |
| Git branching strategy | [docs/git-branching.md](docs/git-branching.md) |
| CI/CD workflows | [docs/cicd-workflows.md](docs/cicd-workflows.md) |
| Database testing (RLS + Auth) | [docs/database-testing.md](docs/database-testing.md) |
| Secrets configuration | [docs/secrets.md](docs/secrets.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Merge workflow (Lovable → Main) | [docs/merge-workflow.md](docs/merge-workflow.md) |
| Commands cheat sheet | [docs/commands.md](docs/commands.md) |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |
| Email templates & SMTP | [docs/email-templates.md](docs/email-templates.md) |
| Stripe SEPA direct debit | [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md) |

> [`stripe-tuition-direct-debit-plan.md`](stripe-tuition-direct-debit-plan.md) is a **historical planning document** (May 2026) and is no longer authoritative. The current Stripe flow is described in [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md).

## License

See [LICENSE](LICENSE)
