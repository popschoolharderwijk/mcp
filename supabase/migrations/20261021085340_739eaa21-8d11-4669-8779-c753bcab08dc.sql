ALTER TABLE public.lesson_signup_requests ADD COLUMN payment_method text NOT NULL DEFAULT 'stripe';
ALTER TABLE public.lesson_signup_requests ADD CONSTRAINT lesson_signup_requests_payment_method_valid CHECK (payment_method IN ('stripe', 'manual'));
UPDATE public.email_templates
SET subject = CASE WHEN subject = 'Je lesovereenkomst bij Popschool Harderwijk is aangemaakt' THEN 'Je lesovereenkomst bij Mplifi' ELSE subject END,
body_html = '<p>Hoi {{leerling_naam}},</p>
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
<p>Veel muziekplezier!<br/>Mplifi</p>', updated_at = now()
WHERE event_key = 'agreement_created' AND body_html = '<p>Hoi {{leerling_naam}},</p>
<p>Fijn dat je bij ons komt lessen! Je lesovereenkomst is aangemaakt met de volgende gegevens:</p>
<ul>
  <li><strong>Docent:</strong> {{docent_naam}}</li>
  <li><strong>Lessoort:</strong> {{les_type}}</li>
  <li><strong>Frequentie:</strong> {{frequentie}}</li>
  <li><strong>Dag &amp; tijd:</strong> {{dag}} om {{tijd}}</li>
  <li><strong>Startdatum:</strong> {{startdatum}}</li>
  <li><strong>Lesgeld:</strong> {{bedrag}}</li>
  <li><strong>Betaalmethode:</strong> {{betaalmethode}}</li>
</ul>
<p>In het leerlingportaal vind je je agenda, facturen en overige informatie over je lessen.</p>
<p>Veel muziekplezier!<br/>Popschool Harderwijk</p>';