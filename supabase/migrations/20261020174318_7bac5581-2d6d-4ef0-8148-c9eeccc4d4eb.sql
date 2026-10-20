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