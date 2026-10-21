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
-- LESSON TYPE OPTIONS (instrument lessons)
-- Only the forms on the tarievenlijst get a tariff. Instrument lessons: 30 min weekly and
-- 30 min biweekly (private-lesson tariffs). Bandcoaching: one form, 60 min biweekly (used by
-- the test agreements and the group "Bandcoaching maandag"). DJ / Beats is not on the list:
-- its forms exist without tariff (Stripe status "Ontbreekt: geen tarief").
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_type_options (lesson_type_id, duration_minutes, frequency)
SELECT lt.id, opt.duration_minutes, opt.frequency
FROM public.lesson_types lt
JOIN (VALUES
  ('Gitaarles', 30, 'weekly'::public.lesson_frequency),
  ('Gitaarles', 30, 'biweekly'::public.lesson_frequency),
  ('Drumles', 30, 'weekly'::public.lesson_frequency),
  ('Drumles', 30, 'biweekly'::public.lesson_frequency),
  ('Zangles', 30, 'weekly'::public.lesson_frequency),
  ('Zangles', 30, 'biweekly'::public.lesson_frequency),
  ('Basles', 30, 'weekly'::public.lesson_frequency),
  ('Basles', 30, 'biweekly'::public.lesson_frequency),
  ('Keyboardles', 30, 'weekly'::public.lesson_frequency),
  ('Keyboardles', 30, 'biweekly'::public.lesson_frequency),
  ('Saxofoonles', 30, 'weekly'::public.lesson_frequency),
  ('Saxofoonles', 30, 'biweekly'::public.lesson_frequency),
  ('Bandcoaching', 60, 'biweekly'::public.lesson_frequency),
  ('DJ / Beats', 45, 'weekly'::public.lesson_frequency),
  ('DJ / Beats', 45, 'biweekly'::public.lesson_frequency),
  ('DJ / Beats', 45, 'monthly'::public.lesson_frequency)
) AS opt(type_name, duration_minutes, frequency) ON opt.type_name = lt.name
WHERE NOT EXISTS (
  SELECT 1 FROM public.lesson_type_options lto
  WHERE lto.lesson_type_id = lt.id
    AND lto.duration_minutes = opt.duration_minutes
    AND lto.frequency = opt.frequency
    AND lto.label IS NULL
);

-- Lesson forms from the tarievenlijst that are not an instrument lesson.
INSERT INTO public.lesson_types (name, description, icon, color, cost_center, is_group_lesson, is_duo_lesson, is_active)
SELECT * FROM (VALUES
  ('Duoles', 'Les met z''n tweeën; tarief per persoon', 'HiUserGroup', '#0EA5E9', NULL, false, true, true),
  ('De Popkids', '8-12 jaar', 'LuMusic', '#22C55E', NULL, true, false, true),
  ('Popkoor', 'Zingen in een koor', 'LuMic', '#E11D48', NULL, true, false, true),
  ('Klank en Kriebels', 'Groepsles, 8 lessen', 'LuMusic', '#F97316', NULL, true, false, true),
  ('Notenkrakers', 'Groepsles, 8 lessen', 'LuMusic2', '#A16207', NULL, true, false, true),
  ('Mini Maestro''s', 'Groepsles, 8 lessen', 'LuMusic3', '#0D9488', NULL, true, false, true),
  ('De Muziekclub', 'Groepsles, 8 lessen', 'LuMusic4', '#7C3AED', NULL, true, false, true),
  ('DJ-School', 'Groepsles, 8 lessen', 'LuHeadphones', '#334155', NULL, true, false, true),
  ('Laatbloeiers', 'Groepsles voor volwassenen, 8 lessen', 'LuAudioWaveform', '#65A30D', NULL, true, false, true)
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
-- -----------------------------------------------------------------------------
-- TARIFFS — exactly the tarievenlijst per 1 september 2026 (cents; monthly amounts,
-- 11x per school year; group lessons one-off). < 21 VAT exempt, 21+ incl. 21% VAT.
-- tests/code/billing/bootstrapTariffs.test.ts checks the marked block against the list.
-- Afterwards every other 1-9-2026 tariff is removed (earlier fictional test data).
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_tarievenlijst;
CREATE TEMP TABLE tmp_tarievenlijst (
  type_name text, duration_minutes integer, frequency public.lesson_frequency,
  label text, under_cents bigint, adult_cents bigint
);
INSERT INTO tmp_tarievenlijst VALUES
-- BEGIN TARIEVENLIJST
  ('Gitaarles', 30, 'weekly', NULL, 7338, 8879),
  ('Gitaarles', 30, 'biweekly', NULL, 3867, 4679),
  ('Drumles', 30, 'weekly', NULL, 7338, 8879),
  ('Drumles', 30, 'biweekly', NULL, 3867, 4679),
  ('Zangles', 30, 'weekly', NULL, 7338, 8879),
  ('Zangles', 30, 'biweekly', NULL, 3867, 4679),
  ('Basles', 30, 'weekly', NULL, 7338, 8879),
  ('Basles', 30, 'biweekly', NULL, 3867, 4679),
  ('Keyboardles', 30, 'weekly', NULL, 7338, 8879),
  ('Keyboardles', 30, 'biweekly', NULL, 3867, 4679),
  ('Saxofoonles', 30, 'weekly', NULL, 7338, 8879),
  ('Saxofoonles', 30, 'biweekly', NULL, 3867, 4679),
  ('Duoles', 30, 'weekly', NULL, 5156, 6239),
  ('Duoles', 30, 'biweekly', NULL, 2679, 3241),
  ('De Popkids', 60, 'weekly', NULL, 2455, NULL),
  ('Popkoor', 60, 'weekly', '12-18 jaar', 3000, NULL),
  ('Popkoor', 60, 'weekly', '18+', 3000, 3631),
  ('Bandcoaching', 60, 'biweekly', NULL, 1691, 2046),
  ('Klank en Kriebels', 45, 'weekly', NULL, 6600, NULL),
  ('Notenkrakers', 45, 'weekly', NULL, 6600, NULL),
  ('Mini Maestro''s', 45, 'weekly', NULL, 7650, NULL),
  ('De Muziekclub', 45, 'weekly', NULL, 7650, NULL),
  ('DJ-School', 60, 'weekly', NULL, 10996, 13305),
  ('Laatbloeiers', 60, 'weekly', NULL, NULL, 8250)
-- END TARIEVENLIJST
;

INSERT INTO public.lesson_type_option_tariffs (lesson_type_option_id, effective_from, amount_under_21_cents, amount_adult_cents)
SELECT lto.id, DATE '2026-09-01', v.under_cents, v.adult_cents
FROM tmp_tarievenlijst v
JOIN public.lesson_types lt ON lt.name = v.type_name
JOIN public.lesson_type_options lto
  ON lto.lesson_type_id = lt.id
 AND lto.duration_minutes = v.duration_minutes
 AND lto.frequency = v.frequency
 AND COALESCE(lto.label, '') = COALESCE(v.label, '')
ON CONFLICT (lesson_type_option_id, effective_from) DO UPDATE
  SET amount_under_21_cents = EXCLUDED.amount_under_21_cents,
      amount_adult_cents = EXCLUDED.amount_adult_cents;

-- Cleanup: remove every other 1-9-2026 tariff (fictional amounts from earlier test data).
DELETE FROM public.lesson_type_option_tariffs t
WHERE t.effective_from = DATE '2026-09-01'
  AND NOT EXISTS (
    SELECT 1
    FROM tmp_tarievenlijst v
    JOIN public.lesson_types lt ON lt.name = v.type_name
    JOIN public.lesson_type_options lto
      ON lto.lesson_type_id = lt.id
     AND lto.duration_minutes = v.duration_minutes
     AND lto.frequency = v.frequency
     AND COALESCE(lto.label, '') = COALESCE(v.label, '')
    WHERE lto.id = t.lesson_type_option_id
  );
DROP TABLE tmp_tarievenlijst;

-- Singleton accounting settings (from accounting_settings migration).
INSERT INTO public.accounting_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- Default email templates (from email_templates migration).
INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'signup_received',
	'Bevestiging van je aanmelding bij Popschool Harderwijk',
	'<p>Hoi {{leerling_naam}},</p>
<p>Bedankt voor je aanmelding bij Popschool Harderwijk!</p>
<p>We hebben je aanvraag voor <strong>{{les_type}}</strong> ({{frequentie}}) ontvangen voor <strong>{{bedrag}}</strong>.</p>
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
	'Je lesovereenkomst bij Mplifi',
	'<p>Hoi {{leerling_naam}},</p>
<p>Fijn dat je bij ons komt lessen! Je lesovereenkomst is bevestigd:</p>
<ul>
  <li><strong>Docent:</strong> {{docent_naam}}</li>
  <li><strong>Lessoort:</strong> {{les_type}}</li>
  <li><strong>Frequentie:</strong> {{frequentie}}</li>
  <li><strong>Dag &amp; tijd:</strong> {{dag}} om {{tijd}}</li>
  <li><strong>Startdatum:</strong> {{startdatum}}</li>
</ul>
{{betaalblok}}
<p>In het leerlingportaal vind je je agenda en facturen.</p>
<p>Veel muziekplezier!<br/>Mplifi</p>',
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
  <li><strong>Lesgeld:</strong> {{bedrag}}</li>
  <li><strong>Betaalmethode:</strong> {{betaalmethode}}</li>
</ul>
<p>De lessen verschijnen automatisch in je agenda.</p>
<p>Groet,<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;

-- Payment invitation (Stripe mandate) e-mail.
INSERT INTO public.email_templates (event_key, subject, body_html, is_enabled) VALUES (
	'direct_debit_invite',
	'Rond je inschrijving af: machtiging voor het lesgeld',
	'<p>Hoi {{ontvanger_naam}},</p>
<p>Fijn dat {{leerling_naam}} bij Popschool Harderwijk op les komt! Om de inschrijving af te ronden vragen we je om één keer toestemming te geven om het lesgeld maandelijks automatisch af te schrijven.</p>
<p><strong>Zo werkt het</strong></p>
<ol>
  <li>Klik op de knop hieronder. Je wordt automatisch ingelogd, een wachtwoord is niet nodig.</li>
  <li>Je komt bij onze betaalpartner Stripe. Kies je bank en bevestig met iDEAL. Daarmee geef je een machtiging af voor automatische incasso (SEPA).</li>
  <li>Klaar. Je hoeft daarna zelf niets meer te doen.</li>
</ol>
<p><strong>Wat je betaalt</strong></p>
<ul>
  <li>{{les_type}}: {{bedrag}} per maand, 11 keer per schooljaar (niet in augustus).</li>
  {{eerste_maand_regel}}
  <li>Startdatum: {{startdatum}}. Je inschrijving loopt minimaal tot en met {{minimale_looptijd_tot}} en daarna per schooljaar door.</li>
  <li>Vóór elke afschrijving krijg je een bericht met het bedrag en de datum, en na afloop een factuur.</li>
</ul>
<p style="margin:24px 0;"><a href="{{link}}" style="display:inline-block;background:#c4ab7c;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Machtiging afgeven</a></p>
<p style="font-size:13px;color:#555;">Werkt de knop niet meer? De link is beperkt geldig. Antwoord dan op deze mail, dan sturen we je een nieuwe uitnodiging. Een afgegeven machtiging kun je bij je bank tot 8 weken na een afschrijving laten terugboeken.</p>
<p>Met muzikale groet,<br/>Popschool Harderwijk</p>',
	true
) ON CONFLICT (event_key) DO NOTHING;
