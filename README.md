# Mplifi Community Portal

Webapplicatie voor het beheer van een muziekschool: leerlingen en docenten, lesovereenkomsten, agenda met recurring lessen, projecten, Stripe-incasso voor lesgeld, e-mailtemplates en uren-/financiële rapportage.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, `react-icons/lu`
- **Backend**: Supabase (Auth, Postgres + RLS, Edge Functions op Deno)
- **Betalingen**: Stripe (SEPA Direct Debit via iDEAL setup)
- **Email**: Resend (custom SMTP voor Supabase Auth + transactionele templates)
- **Testing**: Bun test runner (unit + RLS tegen remote Supabase preview branches)
- **Linting/format**: Biome
- **CI/CD**: GitHub Actions + Supabase GitHub Integration (branching)

## Kernfeatures

- Passwordless inloggen via Magic Link (OTP) — geen wachtwoorden in productie.
- Lesovereenkomsten met leeftijdsafhankelijke tarieven (<21 / 21+), wekelijks/tweewekelijks ritme, lesvrije periodes met **verschuif-logica** (lessen schuiven door, augustus blijft pauze).
- Agenda met recurring events, afwijkingen, annuleringen (docent vs leerling) en multi-participant projecten.
- Stripe SEPA-incasso per lesovereenkomst: setup via iDEAL, daarna maandelijkse `SubscriptionSchedule` over 11 maanden.
- Database-backed e-mailtemplates met inline preview en testverzending.
- Projecten (domein → label → project), polymorfe agenda-koppeling, kostenplaats.
- Uren-/accounting-rapportage met BTW per leeftijdscategorie en lesdatum.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server (tegen mcp-dev Supabase project)
bun dev

# Run tests
bun test --bail
```

> ℹ️ Op Windows kan `bun install` problemen geven met esbuild — gebruik dan `npm install` voor de eerste install en daarna `bun dev`.

## Documentatie

| Onderwerp | Bestand |
|-----------|---------|
| Architectuur & datamodel | [docs/architecture.md](docs/architecture.md) |
| Supabase server setup | [docs/supabase-setup.md](docs/supabase-setup.md) |
| Git branching strategy | [docs/git-branching.md](docs/git-branching.md) |
| CI/CD workflows | [docs/cicd-workflows.md](docs/cicd-workflows.md) |
| Database testing (RLS + Auth) | [docs/database-testing.md](docs/database-testing.md) |
| Secrets configuratie | [docs/secrets.md](docs/secrets.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Merge workflow (Lovable → Main) | [docs/merge-workflow.md](docs/merge-workflow.md) |
| Commands cheat sheet | [docs/commands.md](docs/commands.md) |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |
| E-mailtemplates & SMTP | [docs/email-templates.md](docs/email-templates.md) |
| Stripe SEPA-incasso | [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md) |

> Het bestand [`stripe-tuition-direct-debit-plan.md`](stripe-tuition-direct-debit-plan.md) is een **historisch planningsdocument** (mei 2026) en niet langer leidend. De actuele beschrijving van de Stripe-flow staat in [docs/integrations/stripe-direct-debit.md](docs/integrations/stripe-direct-debit.md).

## License

See [LICENSE](LICENSE)
