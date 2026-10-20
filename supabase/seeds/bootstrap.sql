-- =============================================================================
-- BOOTSTRAP SEED (production-safe)
-- =============================================================================
-- Idempotent reference data for all environments. No auth.users.
-- Safe to run on production via: supabase db push --include-seed
-- =============================================================================
-- -----------------------------------------------------------------------------
-- LESSON TYPE NAMES (reference for search/replace)
-- -----------------------------------------------------------------------------
-- guitar       = 'Gitaarles'
-- drum         = 'Drumles'
-- vocal        = 'Zangles'
-- bass         = 'Basles'
-- keyboard     = 'Keyboardles'
-- saxophone    = 'Saxofoonles'
-- dj_beats     = 'DJ / Beats'
-- band_coaching = 'Bandcoaching'
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- LESSON TYPES (no duration/frequency/price; those live in lesson_type_options)
-- -----------------------------------------------------------------------------
-- Insert all 8 lesson types if they don't exist.
-- Bandcoaching is the only group lesson (is_group_lesson = true).
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_types (name, description, icon, color, cost_center, is_group_lesson, is_active)
SELECT * FROM (VALUES
  ('Gitaarles', NULL, 'LuGuitar', '#FF9500', NULL, false, true),
  ('Drumles', NULL, 'LuDrum', '#DC2626', NULL, false, true),
  ('Zangles', 'Learn to sing', 'LuMic', '#EC4899', NULL, false, true),
  ('Basles', NULL, 'GiGuitarBassHead', '#9333EA', NULL, false, true),
  ('Keyboardles', 'Keyboard lessons', 'LuPiano', '#3B82F6', NULL, false, true),
  ('Saxofoonles', NULL, 'GiSaxophone', '#FFB8A6', NULL, false, true),
  ('DJ / Beats', NULL, 'LuHeadphones', '#F59E0B', NULL, false, true),
  ('Bandcoaching', NULL, 'HiUserGroup', '#6366F1', NULL, true, true)
) AS v(name, description, icon, color, cost_center, is_group_lesson, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.lesson_types WHERE lesson_types.name = v.name);

-- -----------------------------------------------------------------------------
-- LESSON TYPE OPTIONS
-- Not all lesson types have all 15 options (30/45/60/90/120 x weekly/biweekly/monthly).
-- - Gitaarles, Drumles, Zangles, Basles, Keyboardles, Bandcoaching: all 15 options (price = duration).
-- - Saxofoonles: 6 options (30 and 45 min only) — agreements use 30 min weekly.
-- - DJ / Beats: 3 options (45 min only, all frequencies) — agreements use 45 min monthly.
-- -----------------------------------------------------------------------------

-- Full 15 options for: Gitaarles, Drumles, Zangles, Basles, Keyboardles, Bandcoaching
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (30, 'weekly'::public.lesson_frequency, 30.00),
    (30, 'biweekly'::public.lesson_frequency, 30.00),
    (30, 'monthly'::public.lesson_frequency, 30.00),
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00),
    (60, 'weekly'::public.lesson_frequency, 60.00),
    (60, 'biweekly'::public.lesson_frequency, 60.00),
    (60, 'monthly'::public.lesson_frequency, 60.00),
    (90, 'weekly'::public.lesson_frequency, 90.00),
    (90, 'biweekly'::public.lesson_frequency, 90.00),
    (90, 'monthly'::public.lesson_frequency, 90.00),
    (120, 'weekly'::public.lesson_frequency, 120.00),
    (120, 'biweekly'::public.lesson_frequency, 120.00),
    (120, 'monthly'::public.lesson_frequency, 120.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name IN ('Gitaarles', 'Drumles', 'Zangles', 'Basles', 'Keyboardles', 'Bandcoaching')
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- Saxofoonles: only 30 and 45 min (6 options) — agreements use 30 min weekly
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (30, 'weekly'::public.lesson_frequency, 30.00),
    (30, 'biweekly'::public.lesson_frequency, 30.00),
    (30, 'monthly'::public.lesson_frequency, 30.00),
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name = 'Saxofoonles'
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- DJ / Beats: only 45 min, all 3 frequencies (3 options) — agreements use 45 min monthly
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, price_per_lesson)
SELECT lt.id, opt.duration_minutes, opt.frequency, opt.price_per_lesson
FROM public.lesson_types lt
CROSS JOIN (
  VALUES
    (45, 'weekly'::public.lesson_frequency, 45.00),
    (45, 'biweekly'::public.lesson_frequency, 45.00),
    (45, 'monthly'::public.lesson_frequency, 45.00)
) AS opt(duration_minutes, frequency, price_per_lesson)
WHERE lt.name = 'DJ / Beats'
  AND NOT EXISTS (
    SELECT 1 FROM public.lesson_type_options lto
    WHERE lto.lesson_type_id = lt.id
      AND lto.duration_minutes = opt.duration_minutes
      AND lto.frequency = opt.frequency
      AND lto.price_per_lesson = opt.price_per_lesson
  );

-- -----------------------------------------------------------------------------
-- TARIFFS (tarievenlijst per 1 september 2026; monthly amounts, 11x per school year)
-- Amounts in cents: < 21 (VAT exempt) and 21+ (incl. 21% VAT), exactly as published.
-- Instrument lessons: 30 min weekly/biweekly use the private-lesson tariffs; other
-- durations scale with the duration (fictional test data); monthly = half of biweekly.
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_type_option_tariffs (lesson_type_option_id, effective_from, amount_under_21_cents, amount_adult_cents)
SELECT
  lto.id,
  DATE '2026-09-01',
  round(base.under_cents * lto.duration_minutes / 30.0)::bigint,
  round(base.adult_cents * lto.duration_minutes / 30.0)::bigint
FROM public.lesson_type_options lto
JOIN public.lesson_types lt ON lt.id = lto.lesson_type_id
JOIN (VALUES
  ('weekly'::public.lesson_frequency, 7338, 8879),
  ('biweekly'::public.lesson_frequency, 3867, 4679),
  ('monthly'::public.lesson_frequency, 1934, 2340)
) AS base(frequency, under_cents, adult_cents) ON base.frequency = lto.frequency
WHERE lt.name <> 'Bandcoaching'
ON CONFLICT (lesson_type_option_id, effective_from) DO NOTHING;

-- Bandcoaching: one tariff for every option.
INSERT INTO public.lesson_type_option_tariffs (lesson_type_option_id, effective_from, amount_under_21_cents, amount_adult_cents)
SELECT lto.id, DATE '2026-09-01', 1691, 2046
FROM public.lesson_type_options lto
JOIN public.lesson_types lt ON lt.id = lto.lesson_type_id
WHERE lt.name = 'Bandcoaching'
ON CONFLICT (lesson_type_option_id, effective_from) DO NOTHING;

-- Lesson forms from the tarievenlijst that are not an instrument lesson.
INSERT INTO public.lesson_types (name, description, icon, color, cost_center, is_group_lesson, is_duo_lesson, is_active)
SELECT * FROM (VALUES
  ('Duoles', 'Les met z''n tweeën; tarief per persoon', 'LuUsers', '#0EA5E9', NULL, false, true, true),
  ('De Popkids', '8-12 jaar', 'LuMusic', '#22C55E', NULL, true, false, true),
  ('Popkoor', 'Zingen in een koor', 'LuMicVocal', '#E11D48', NULL, true, false, true),
  ('Klank en Kriebels', 'Groepsles, 8 lessen', 'LuBaby', '#F97316', NULL, true, false, true),
  ('Notenkrakers', 'Groepsles, 8 lessen', 'LuMusic2', '#A16207', NULL, true, false, true),
  ('Mini Maestro''s', 'Groepsles, 8 lessen', 'LuMusic3', '#0D9488', NULL, true, false, true),
  ('De Muziekclub', 'Groepsles, 8 lessen', 'LuMusic4', '#7C3AED', NULL, true, false, true),
  ('DJ-School', 'Groepsles, 8 lessen', 'LuDisc3', '#334155', NULL, true, false, true),
  ('Laatbloeiers', 'Groepsles voor volwassenen, 8 lessen', 'LuSprout', '#65A30D', NULL, true, false, true)
) AS v(name, description, icon, color, cost_center, is_group_lesson, is_duo_lesson, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.lesson_types WHERE lesson_types.name = v.name);

INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency, label, billing_kind, has_adult_tariff)
SELECT lt.id, v.duration_minutes, v.frequency, v.label, v.billing_kind, v.has_adult_tariff
FROM (VALUES
  ('Duoles', 30, 'weekly'::public.lesson_frequency, NULL::text, 'monthly', true),
  ('Duoles', 30, 'biweekly'::public.lesson_frequency, NULL, 'monthly', true),
  ('De Popkids', 60, 'weekly'::public.lesson_frequency, NULL, 'monthly', false),
  ('Popkoor', 60, 'weekly'::public.lesson_frequency, '12-18 jaar', 'monthly', false),
  ('Popkoor', 60, 'weekly'::public.lesson_frequency, '18+', 'monthly', true),
  ('Klank en Kriebels', 45, 'weekly'::public.lesson_frequency, NULL, 'one_off', false),
  ('Notenkrakers', 45, 'weekly'::public.lesson_frequency, NULL, 'one_off', false),
  ('Mini Maestro''s', 45, 'weekly'::public.lesson_frequency, NULL, 'one_off', false),
  ('De Muziekclub', 45, 'weekly'::public.lesson_frequency, NULL, 'one_off', false),
  ('DJ-School', 60, 'weekly'::public.lesson_frequency, NULL, 'one_off', true),
  ('Laatbloeiers', 60, 'weekly'::public.lesson_frequency, NULL, 'one_off', true)
) AS v(type_name, duration_minutes, frequency, label, billing_kind, has_adult_tariff)
JOIN public.lesson_types lt ON lt.name = v.type_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.lesson_type_options lto
  WHERE lto.lesson_type_id = lt.id
    AND lto.duration_minutes = v.duration_minutes
    AND lto.frequency = v.frequency
    AND COALESCE(lto.label, '') = COALESCE(v.label, '')
);

INSERT INTO public.lesson_type_option_tariffs (lesson_type_option_id, effective_from, amount_under_21_cents, amount_adult_cents)
SELECT lto.id, DATE '2026-09-01', v.under_cents, v.adult_cents
FROM (VALUES
  ('Duoles', 'weekly'::public.lesson_frequency, NULL::text, 5156, 6239),
  ('Duoles', 'biweekly'::public.lesson_frequency, NULL, 2679, 3241),
  ('De Popkids', 'weekly'::public.lesson_frequency, NULL, 2455, NULL),
  ('Popkoor', 'weekly'::public.lesson_frequency, '12-18 jaar', 3000, NULL),
  ('Popkoor', 'weekly'::public.lesson_frequency, '18+', 3000, 3631),
  ('Klank en Kriebels', 'weekly'::public.lesson_frequency, NULL, 6600, NULL),
  ('Notenkrakers', 'weekly'::public.lesson_frequency, NULL, 6600, NULL),
  ('Mini Maestro''s', 'weekly'::public.lesson_frequency, NULL, 7650, NULL),
  ('De Muziekclub', 'weekly'::public.lesson_frequency, NULL, 7650, NULL),
  ('DJ-School', 'weekly'::public.lesson_frequency, NULL, 10996, 13305),
  ('Laatbloeiers', 'weekly'::public.lesson_frequency, NULL, NULL, 8250)
) AS v(type_name, frequency, label, under_cents, adult_cents)
JOIN public.lesson_types lt ON lt.name = v.type_name
JOIN public.lesson_type_options lto
  ON lto.lesson_type_id = lt.id
 AND lto.frequency = v.frequency
 AND COALESCE(lto.label, '') = COALESCE(v.label, '')
ON CONFLICT (lesson_type_option_id, effective_from) DO NOTHING;

-- Singleton accounting settings (from accounting_settings migration).
INSERT INTO public.accounting_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Default email templates (from email_templates migration).
INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'signup_received',
	'Bevestiging van je aanmelding bij Popschool Harderwijk',
	'<p>Hoi {{leerling_naam}},</p>
<p>Bedankt voor je aanmelding bij Popschool Harderwijk!</p>
<p>We hebben je aanvraag voor <strong>{{les_type}}</strong> ({{frequentie}}) ontvangen voor <strong>{{prijs_per_les}}</strong> per les.</p>
<p>We nemen zo snel mogelijk contact met je op om je inschrijving te verwerken.</p>
<p>Met muzikale groet,<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'trial_scheduled',
	'Je proefles bij Popschool Harderwijk is ingepland',
	'<p>Hoi {{leerling_naam}},</p>
<p>Je proefles voor <strong>{{les_type}}</strong> is ingepland op <strong>{{datum}}</strong> om <strong>{{tijd}}</strong> ({{duur}} minuten).</p>
<p>Na de proefles kun je in de portal aangeven of je verder wilt met lessen. Pas dan stellen we een definitieve overeenkomst op.</p>
<p>Veel plezier en tot dan!<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'trial_scheduled_teacher',
	'Nieuwe proefles ingepland: {{leerling_naam}}',
	'<p>Hoi {{docent_naam}},</p>
<p>Er is een proefles voor je ingepland.</p>
<ul>
  <li><strong>Leerling:</strong> {{leerling_naam}}</li>
  <li><strong>Lessoort:</strong> {{les_type}}</li>
  <li><strong>Datum:</strong> {{datum}}</li>
  <li><strong>Tijd:</strong> {{tijd}} ({{duur}} minuten)</li>
</ul>
<p>De afspraak staat in je agenda.</p>
<p>Groet,<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'agreement_created',
	'Je lesovereenkomst bij Popschool Harderwijk is aangemaakt',
	'<p>Hoi {{leerling_naam}},</p>
<p>Fijn dat je bij ons komt lessen! Je lesovereenkomst is aangemaakt met de volgende gegevens:</p>
<ul>
  <li><strong>Docent:</strong> {{docent_naam}}</li>
  <li><strong>Lessoort:</strong> {{les_type}}</li>
  <li><strong>Frequentie:</strong> {{frequentie}}</li>
  <li><strong>Dag &amp; tijd:</strong> {{dag}} om {{tijd}}</li>
  <li><strong>Startdatum:</strong> {{startdatum}}</li>
  <li><strong>Prijs per les:</strong> {{prijs_per_les}}</li>
  <li><strong>Betaalmethode:</strong> {{betaalmethode}}</li>
</ul>
<p>In het leerlingportaal vind je je agenda, facturen en overige informatie over je lessen.</p>
<p>Veel muziekplezier!<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'agreement_created_teacher',
	'Nieuwe lesovereenkomst: {{leerling_naam}}',
	'<p>Hoi {{docent_naam}},</p>
<p>Er is een nieuwe lesovereenkomst aan je gekoppeld:</p>
<ul>
  <li><strong>Leerling:</strong> {{leerling_naam}}</li>
  <li><strong>Lessoort:</strong> {{les_type}}</li>
  <li><strong>Frequentie:</strong> {{frequentie}}</li>
  <li><strong>Dag &amp; tijd:</strong> {{dag}} om {{tijd}}</li>
  <li><strong>Startdatum:</strong> {{startdatum}}</li>
  <li><strong>Prijs per les:</strong> {{prijs_per_les}}</li>
  <li><strong>Betaalmethode:</strong> {{betaalmethode}}</li>
</ul>
<p>De lessen verschijnen automatisch in je agenda.</p>
<p>Groet,<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

