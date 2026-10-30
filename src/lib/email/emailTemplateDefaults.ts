/**
 * Bootstrap defaults for email_templates — must match supabase/seeds/bootstrap.sql.
 */
import type { EmailTemplateEditorState } from '@/lib/email/emailTemplateManagerHelpers';

export const EMAIL_TEMPLATE_BOOTSTRAP = {
	signup_received: {
		subject: 'Bevestiging van je aanmelding bij Popschool Harderwijk',
		body_markdown: `Hoi {{leerling_naam}},

Bedankt voor je aanmelding bij Popschool Harderwijk!

We hebben je aanvraag voor **{{les_type}}** ({{frequentie}}) ontvangen voor **{{prijs_per_les}}** per les.

We nemen zo snel mogelijk contact met je op om je inschrijving te verwerken.

Met muzikale groet,
Popschool Harderwijk`,
	},
	trial_scheduled: {
		subject: 'Je proefles bij Popschool Harderwijk is ingepland',
		body_markdown: `Hoi {{leerling_naam}},

Je proefles voor **{{les_type}}** is ingepland op **{{datum}}** om **{{tijd}}** ({{duur}} minuten).

Na de proefles kun je in de portal aangeven of je verder wilt met lessen. Pas dan stellen we een definitieve overeenkomst op.

Veel plezier en tot dan!
Popschool Harderwijk`,
	},
	trial_scheduled_teacher: {
		subject: 'Nieuwe proefles ingepland: {{leerling_naam}}',
		body_markdown: `Hoi {{docent_naam}},

Er is een proefles voor je ingepland.

- **Leerling:** {{leerling_naam}}
- **Lessoort:** {{les_type}}
- **Datum:** {{datum}}
- **Tijd:** {{tijd}} ({{duur}} minuten)

De afspraak staat in je agenda.

Groet,
Popschool Harderwijk`,
	},
	agreement_created: {
		subject: 'Je lesovereenkomst bij Popschool Harderwijk is aangemaakt',
		body_markdown: `Hoi {{leerling_naam}},

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
Popschool Harderwijk`,
	},
	agreement_created_teacher: {
		subject: 'Nieuwe lesovereenkomst: {{leerling_naam}}',
		body_markdown: `Hoi {{docent_naam}},

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
Popschool Harderwijk`,
	},
} as const satisfies Record<string, EmailTemplateEditorState>;

type EmailTemplateBootstrapKey = keyof typeof EMAIL_TEMPLATE_BOOTSTRAP;

export function getEmailTemplateBootstrap(eventKey: string): EmailTemplateEditorState | null {
	if (!(eventKey in EMAIL_TEMPLATE_BOOTSTRAP)) return null;
	const defaults = EMAIL_TEMPLATE_BOOTSTRAP[eventKey as EmailTemplateBootstrapKey];
	return {
		subject: defaults.subject,
		body_markdown: defaults.body_markdown,
	};
}

export function isEmailTemplateEditorDirty(
	editor: EmailTemplateEditorState,
	row: { subject: string; body_markdown: string },
): boolean {
	return editor.subject !== row.subject || editor.body_markdown !== row.body_markdown;
}

export function isEmailTemplateEditorAtBootstrap(editor: EmailTemplateEditorState, eventKey: string): boolean {
	const defaults = getEmailTemplateBootstrap(eventKey);
	if (!defaults) return true;
	return editor.subject === defaults.subject && editor.body_markdown === defaults.body_markdown;
}
