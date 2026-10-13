-- =============================================================================
-- BOOTSTRAP SEED (production-safe)
-- =============================================================================
-- Idempotent reference data for all environments. No auth.users.
-- Safe to run on production via: supabase db push --include-seed
-- Lesson types live in lesson-types.sql (dev/test only).
-- =============================================================================

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
