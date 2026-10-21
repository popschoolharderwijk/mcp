// Central registry of all event-driven email types.
// For each type we define the label, description, and available variables
// that can be used in subject and body via {{variable}} notation.
//
// Changes here must also be mirrored in `supabase/functions/_shared/email-events.ts`.

export interface EmailEventDefinition {
	key: string;
	label: string;
	description: string;
	variables: readonly string[];
	previewData: Record<string, string>;
}

const EMAIL_EVENTS = {
	signup_received: {
		key: 'signup_received',
		label: 'Bevestiging aanmelding',
		description: 'Verstuurd direct na het indienen van een aanmeldformulier op de publieke aanmeldpagina.',
		variables: ['leerling_naam', 'les_type', 'frequentie', 'bedrag'],
		previewData: {
			leerling_naam: 'Sanne de Vries',
			les_type: 'Pianoles',
			frequentie: 'wekelijks',
			bedrag: '€ 73,38 per maand',
		},
	},
	trial_scheduled: {
		key: 'trial_scheduled',
		label: 'Proefles ingepland (leerling)',
		description: 'Verstuurd naar de leerling (of ouder) wanneer een proefles is ingepland.',
		variables: ['leerling_naam', 'les_type', 'datum', 'tijd', 'duur'],
		previewData: {
			leerling_naam: 'Sanne de Vries',
			les_type: 'Pianoles',
			datum: '2026-06-03',
			tijd: '15:30',
			duur: '30',
		},
	},
	trial_scheduled_teacher: {
		key: 'trial_scheduled_teacher',
		label: 'Proefles ingepland (docent)',
		description: 'Verstuurd naar de docent wanneer er een proefles voor hem/haar is ingepland.',
		variables: ['docent_naam', 'leerling_naam', 'les_type', 'datum', 'tijd', 'duur'],
		previewData: {
			docent_naam: 'Jan Jansen',
			leerling_naam: 'Sanne de Vries',
			les_type: 'Pianoles',
			datum: '2026-06-03',
			tijd: '15:30',
			duur: '30',
		},
	},
	agreement_created: {
		key: 'agreement_created',
		label: 'Overeenkomst aangemaakt (leerling)',
		description: 'Verstuurd naar de leerling zodra er een nieuwe lesovereenkomst is aangemaakt.',
		variables: [
			'leerling_naam',
			'docent_naam',
			'les_type',
			'frequentie',
			'bedrag',
			'dag',
			'tijd',
			'startdatum',
			'betaalmethode',
			'betaalblok',
			'eerste_maand_bedrag',
			'inhaal_bedrag',
			'minimale_looptijd_tot',
			'link',
		],
		previewData: {
			leerling_naam: 'Sanne de Vries',
			docent_naam: 'Jan Jansen',
			les_type: 'Pianoles',
			frequentie: 'wekelijks',
			bedrag: '€ 73,38 per maand',
			dag: 'dinsdag',
			tijd: '15:30',
			startdatum: '2026-09-01',
			betaalmethode: 'Machtiging via iDEAL',
			betaalblok: '<p>Je maandbedrag is € 73,38 (vrijgesteld van btw).</p><p>Machtiging afgeven</p>',
			eerste_maand_bedrag: '',
			inhaal_bedrag: '',
			minimale_looptijd_tot: '30-04-2027',
			link: 'https://mcp.mplifi.nl/direct-debit/start',
		},
	},
	agreement_created_teacher: {
		key: 'agreement_created_teacher',
		label: 'Overeenkomst aangemaakt (docent)',
		description: 'Verstuurd naar de docent zodra er een nieuwe lesovereenkomst met hem/haar is aangemaakt.',
		variables: [
			'docent_naam',
			'leerling_naam',
			'les_type',
			'frequentie',
			'bedrag',
			'dag',
			'tijd',
			'startdatum',
			'betaalmethode',
		],
		previewData: {
			docent_naam: 'Jan Jansen',
			leerling_naam: 'Sanne de Vries',
			les_type: 'Pianoles',
			frequentie: 'wekelijks',
			bedrag: '€ 73,38 per maand',
			dag: 'dinsdag',
			tijd: '15:30',
			startdatum: '2026-09-01',
			betaalmethode: 'Automatische incasso (SEPA)',
		},
	},
	direct_debit_invite: {
		key: 'direct_debit_invite',
		label: 'Betaaluitnodiging (Stripe)',
		description:
			'Verstuurd met de knop "Stuur betaaluitnodiging": uitleg over de machtiging en een inloglink naar Stripe. eerste_maand_regel is een kant-en-klare regel die leeg blijft als de eerste maand niet naar rato is.',
		variables: [
			'leerling_naam',
			'ontvanger_naam',
			'les_type',
			'bedrag',
			'eerste_maand_bedrag',
			'eerste_maand_regel',
			'startdatum',
			'minimale_looptijd_tot',
			'link',
		],
		previewData: {
			leerling_naam: 'Sanne de Vries',
			ontvanger_naam: 'Ingrid de Vries',
			les_type: 'Gitaarles (30 min, wekelijks)',
			bedrag: '€ 73,38 (vrijgesteld van btw)',
			eerste_maand_bedrag: '€ 26,04',
			eerste_maand_regel:
				'<li>Start je halverwege de maand, dan betaal je de eerste maand naar rato: € 26,04.</li>',
			startdatum: '21-10-2026',
			minimale_looptijd_tot: '30-04-2027',
			link: 'https://mcp.mplifi.nl/direct-debit/start',
		},
	},
} as const satisfies Record<string, EmailEventDefinition>;

export function listEmailEvents(): EmailEventDefinition[] {
	return Object.values(EMAIL_EVENTS);
}
