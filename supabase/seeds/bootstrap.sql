-- =============================================================================
-- BOOTSTRAP SEED (production-safe)
-- =============================================================================
-- Idempotent reference data for all environments. No auth.users.
-- Safe to run on production via: supabase db push --include-seed
-- Lesson types live in lesson-types.sql (dev/test only).
-- =============================================================================

-- Application settings (key → jsonb). Values mirrored in tests/rls/seed-data-constants.ts APP_SETTINGS
-- and src/lib/settings/appSettingsDefaults.ts.
INSERT INTO public.app_settings (key, value) VALUES
	('school_year', '{"start_month":9,"end_month":7}'::jsonb),
	('agenda', '{"start_hour":8,"end_hour":21,"slot_minutes":30}'::jsonb),
	('vat', '{"age_threshold_years":21,"standard_rate_percent":21}'::jsonb),
	('branding', '{"primary_hex":"#c4ab7c"}'::jsonb),
	('trial_lessons', '{"horizon_days":30,"default_duration_minutes":30}'::jsonb),
	('agreements', '{"default_start_offset_days":1,"default_payment_method":"stripe"}'::jsonb),
	('tips', '{"enabled":false,"auto_interval_minutes":10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Default email templates (from email_templates migration). Bodies are markdown.
INSERT INTO public.email_templates (event_key, subject, body_markdown) VALUES (
	'signup_received',
	'Bevestiging van je aanmelding bij Popschool Harderwijk',
	'Hoi {{leerling_naam}},

Bedankt voor je aanmelding bij Popschool Harderwijk!

We hebben je aanvraag voor **{{les_type}}** ({{frequentie}}) ontvangen voor **{{prijs_per_les}}** per les.

We nemen zo snel mogelijk contact met je op om je inschrijving te verwerken.

Met muzikale groet,
Popschool Harderwijk'
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_markdown) VALUES (
	'trial_scheduled',
	'Je proefles bij Popschool Harderwijk is ingepland',
	'Hoi {{leerling_naam}},

Je proefles voor **{{les_type}}** is ingepland op **{{datum}}** om **{{tijd}}** ({{duur}} minuten).

Na de proefles kun je in de portal aangeven of je verder wilt met lessen. Pas dan stellen we een definitieve overeenkomst op.

Veel plezier en tot dan!
Popschool Harderwijk'
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_markdown) VALUES (
	'trial_scheduled_teacher',
	'Nieuwe proefles ingepland: {{leerling_naam}}',
	'Hoi {{docent_naam}},

Er is een proefles voor je ingepland.

- **Leerling:** {{leerling_naam}}
- **Lessoort:** {{les_type}}
- **Datum:** {{datum}}
- **Tijd:** {{tijd}} ({{duur}} minuten)

De afspraak staat in je agenda.

Groet,
Popschool Harderwijk'
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_markdown) VALUES (
	'agreement_created',
	'Je lesovereenkomst bij Popschool Harderwijk is aangemaakt',
	'Hoi {{leerling_naam}},

Fijn dat je bij ons komt lessen! Je lesovereenkomst is aangemaakt met de volgende gegevens:

- **Docent:** {{docent_naam}}
- **Lessoort:** {{les_type}}
- **Frequentie:** {{frequentie}}
- **Dag & tijd:** {{dag}} om {{tijd}}
- **Startdatum:** {{startdatum}}
- **Prijs per les:** {{prijs_per_les}}
- **Betaalmethode:** {{betaalmethode}}

{{betaalblok}}

Veel muziekplezier!
Popschool Harderwijk'
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_markdown) VALUES (
	'agreement_created_teacher',
	'Nieuwe lesovereenkomst: {{leerling_naam}}',
	'Hoi {{docent_naam}},

Er is een nieuwe lesovereenkomst aan je gekoppeld:

- **Leerling:** {{leerling_naam}}
- **Lessoort:** {{les_type}}
- **Frequentie:** {{frequentie}}
- **Dag & tijd:** {{dag}} om {{tijd}}
- **Startdatum:** {{startdatum}}
- **Prijs per les:** {{prijs_per_les}}
- **Betaalmethode:** {{betaalmethode}}

De lessen verschijnen automatisch in je agenda.

Groet,
Popschool Harderwijk'
) ON CONFLICT (event_key) DO NOTHING;
