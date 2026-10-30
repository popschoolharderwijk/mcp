const DAY_NAMES_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

const FREQUENCY_LABELS: Record<string, string> = {
	weekly: 'wekelijks',
	biweekly: 'om de week',
	monthly: 'maandelijks',
};

const STRIPE_PAYMENT_METHOD_LABEL = 'Stripe';

function formatAgreementMailPrice(value: number | null | undefined): string {
	if (value === null || value === undefined) return '';
	return new Intl.NumberFormat('nl-NL', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
	}).format(value);
}

function formatAgreementMailDate(iso: string | null | undefined): string {
	if (!iso) return '';
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return iso;
	return `${match[3]}-${match[2]}-${match[1]}`;
}

function formatAgreementMailTime(time: string | null | undefined): string {
	if (!time) return '';
	return time.slice(0, 5);
}

function buildProfileDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	fallback: string,
): string {
	return `${firstName ?? ''} ${lastName ?? ''}`.trim() || fallback;
}

function extractLessonTypeName(lessonTypes: { name?: string } | { name?: string }[] | null | undefined): string {
	if (Array.isArray(lessonTypes)) return lessonTypes[0]?.name ?? '';
	return lessonTypes?.name ?? '';
}

export interface AgreementMailAgreement {
	day_of_week: number;
	start_time: string;
	start_date: string;
	frequency: string;
	price_per_lesson: number | null;
}

export interface AgreementMailSharedVars {
	leerling_naam: string;
	docent_naam: string;
	les_type: string;
	frequentie: string;
	prijs_per_les: string;
	dag: string;
	tijd: string;
	startdatum: string;
	betaalmethode: string;
}

function buildAgreementMailSharedVars(
	agreement: AgreementMailAgreement,
	studentName: string,
	teacherName: string,
	lessonTypeName: string,
): AgreementMailSharedVars {
	return {
		leerling_naam: studentName,
		docent_naam: teacherName,
		les_type: lessonTypeName,
		frequentie: FREQUENCY_LABELS[agreement.frequency] ?? agreement.frequency,
		prijs_per_les: formatAgreementMailPrice(agreement.price_per_lesson),
		dag: DAY_NAMES_NL[agreement.day_of_week] ?? '',
		tijd: formatAgreementMailTime(agreement.start_time),
		startdatum: formatAgreementMailDate(agreement.start_date),
		betaalmethode: STRIPE_PAYMENT_METHOD_LABEL,
	};
}

export interface AgreementMailProfile {
	email?: string | null;
	first_name?: string | null;
	last_name?: string | null;
}

export type AgreementMailEventKey = 'agreement_created' | 'agreement_created_teacher';

export interface AgreementMailTarget {
	eventKey: AgreementMailEventKey;
	email: string;
}

export interface AgreementMailContext {
	studentName: string;
	teacherName: string;
	lessonType: string;
	sharedVars: AgreementMailSharedVars;
}

function normalizeAgreementMailEmail(email: string): string {
	return email.toLowerCase();
}

export function buildAgreementMailInvokeBody(
	eventKey: AgreementMailEventKey,
	email: string,
	vars: AgreementMailSharedVars,
): { event_key: AgreementMailEventKey; to: string; vars: AgreementMailSharedVars } {
	return {
		event_key: eventKey,
		to: normalizeAgreementMailEmail(email),
		vars,
	};
}

export function buildAgreementMailContext(
	agreement: AgreementMailAgreement & {
		lesson_types?: { name?: string } | { name?: string }[] | null;
	},
	studentProfile: AgreementMailProfile | null | undefined,
	teacherProfile: AgreementMailProfile | null | undefined,
): AgreementMailContext {
	const studentName = buildProfileDisplayName(studentProfile?.first_name, studentProfile?.last_name, 'leerling');
	const teacherName = buildProfileDisplayName(teacherProfile?.first_name, teacherProfile?.last_name, 'docent');
	const lessonType = extractLessonTypeName(agreement.lesson_types);
	return {
		studentName,
		teacherName,
		lessonType,
		sharedVars: buildAgreementMailSharedVars(agreement, studentName, teacherName, lessonType),
	};
}

export function buildAgreementMailTargets(
	studentEmail: string | null | undefined,
	teacherEmail: string | null | undefined,
): AgreementMailTarget[] {
	const targets: AgreementMailTarget[] = [];
	if (studentEmail) {
		targets.push({ eventKey: 'agreement_created', email: studentEmail });
	}
	if (teacherEmail) {
		targets.push({ eventKey: 'agreement_created_teacher', email: teacherEmail });
	}
	return targets;
}
