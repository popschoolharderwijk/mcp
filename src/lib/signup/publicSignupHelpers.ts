import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import { isValidPhone } from '@/components/students/studentFormTypes';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { frequencyLabels } from '@/lib/frequencies';
import type { LessonFrequency } from '@/types/lesson-agreements';

/** Individual lessons with no catalog options need an explicit Next on the choice step. */
export function needsManualSignupChoiceNext(isGroupLesson: boolean, optionCount: number): boolean {
	return !isGroupLesson && optionCount === 0;
}

/** Group row for the overview step; waitlist / unset → null. */
export function resolveSelectedSignupGroup<T extends { id: string }>(
	groups: readonly T[],
	selectedGroupId: string | 'waitlist' | null,
): T | null {
	if (!selectedGroupId || selectedGroupId === 'waitlist') return null;
	return groups.find((group) => group.id === selectedGroupId) ?? null;
}

export interface LessonTypeOptionMatch {
	id: string;
	duration_minutes: number;
	frequency: string;
	price_per_lesson: number;
}

export interface SignupFormFields {
	first_name: string;
	last_name: string;
	email: string;
	phone_number: string;
	date_of_birth: string;
	parent_name: string;
	parent_email: string;
	parent_phone_number: string;
	notes: string;
}

export interface SignupLessonType {
	id: string;
	is_group_lesson: boolean;
}

function resolveLessonTypeOptionId(
	lessonTypeOptions: LessonTypeOptionMatch[],
	selectedOption: OptionSnapshot | null,
): string | null {
	if (!selectedOption) return null;
	const match = lessonTypeOptions.find(
		(option) =>
			option.duration_minutes === selectedOption.duration_minutes &&
			option.frequency === selectedOption.frequency &&
			option.price_per_lesson === selectedOption.price_per_lesson,
	);
	return match?.id ?? null;
}

function resolveSignupGroupId(
	selectedType: SignupLessonType,
	selectedGroupId: string | 'waitlist' | null,
): string | null {
	if (!selectedType.is_group_lesson) return null;
	if (selectedGroupId === 'waitlist' || selectedGroupId === null) return null;
	return selectedGroupId;
}

function buildSignupRequestBody(
	selectedType: SignupLessonType,
	form: SignupFormFields,
	groupId: string | null,
	optionId: string | null,
) {
	return {
		lesson_type_id: selectedType.id,
		lesson_group_id: groupId,
		lesson_type_option_id: optionId,
		...form,
	};
}

function parseSignupResponseError(data: unknown): string | null {
	if (!data || typeof data !== 'object') return null;
	const error = (data as { error?: unknown }).error;
	return typeof error === 'string' ? error : null;
}

function resolvePublicSignupSubmitPayload(params: {
	selectedType: SignupLessonType;
	selectedGroupId: string | 'waitlist' | null;
	selectedOption: OptionSnapshot | null;
	lessonTypeOptions: LessonTypeOptionMatch[];
	form: SignupFormFields;
}) {
	const groupId = resolveSignupGroupId(params.selectedType, params.selectedGroupId);
	const optionId = params.selectedType.is_group_lesson
		? null
		: resolveLessonTypeOptionId(params.lessonTypeOptions, params.selectedOption);
	return buildSignupRequestBody(params.selectedType, params.form, groupId, optionId);
}

export type PublicSignupSubmitOutcome =
	| { kind: 'invoke-error'; message: string }
	| { kind: 'response-error'; message: string }
	| { kind: 'success' };

/** Null when optional phones are empty or exactly 10 digits. */
export function getPublicSignupFormValidationError(form: SignupFormFields): string | null {
	if (form.phone_number && !isValidPhone(form.phone_number)) {
		return 'Telefoonnummer moet 10 cijfers bevatten';
	}
	if (form.parent_phone_number && !isValidPhone(form.parent_phone_number)) {
		return 'Ouder telefoonnummer moet 10 cijfers bevatten';
	}
	return null;
}

export async function executePublicSignupSubmit(params: {
	selectedType: SignupLessonType;
	selectedGroupId: string | 'waitlist' | null;
	selectedOption: OptionSnapshot | null;
	lessonTypeOptions: LessonTypeOptionMatch[];
	form: SignupFormFields;
	invoke: (body: ReturnType<typeof buildSignupRequestBody>) => Promise<{
		data: unknown;
		error: { message?: string } | null;
	}>;
	getInvokeErrorMessage: (error: unknown, options: { fallback: string }) => Promise<string>;
}): Promise<PublicSignupSubmitOutcome> {
	const validationError = getPublicSignupFormValidationError(params.form);
	if (validationError) return { kind: 'response-error', message: validationError };

	const body = resolvePublicSignupSubmitPayload({
		selectedType: params.selectedType,
		selectedGroupId: params.selectedGroupId,
		selectedOption: params.selectedOption,
		lessonTypeOptions: params.lessonTypeOptions,
		form: params.form,
	});

	const { data, error } = await params.invoke(body);
	if (error) {
		const message = await params.getInvokeErrorMessage(error, { fallback: 'Er ging iets mis' });
		return { kind: 'invoke-error', message };
	}

	const responseError = parseSignupResponseError(data);
	if (responseError) return { kind: 'response-error', message: responseError };

	return { kind: 'success' };
}

export function applyPublicSignupSubmitOutcome(
	outcome: PublicSignupSubmitOutcome,
	setError: (error: string | null) => void,
	onSuccess: () => void,
): void {
	if (outcome.kind === 'invoke-error') {
		setError(outcome.message);
		return;
	}
	if (outcome.kind === 'response-error') {
		setError(outcome.message);
		return;
	}
	onSuccess();
}

/** Stepper label for signup step 2 — depends on lesson type chosen in step 1. */
export function resolveSignupChoiceStepLabel(isGroupLesson: boolean | null | undefined): string {
	if (isGroupLesson) return 'Kies groep';
	return 'Hoe vaak?';
}

export interface SignupOverviewRow {
	label: string;
	value: string;
}

const DAY_LABELS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'] as const;

function pushIfPresent(rows: SignupOverviewRow[], label: string, value: string | null | undefined): void {
	const trimmed = value?.trim();
	if (!trimmed) return;
	rows.push({ label, value: trimmed });
}

function formatSignupOptionLine(option: OptionSnapshot): string {
	const freq = frequencyLabels[option.frequency as LessonFrequency] ?? option.frequency;
	return `${option.duration_minutes} min · ${freq} · €${Number(option.price_per_lesson).toFixed(2)} per les`;
}

function formatSignupGroupLine(group: {
	name: string;
	day_of_week: number;
	start_time: string;
	duration_minutes: number;
	frequency: string;
	price_per_lesson: number;
	teacher_name: string | null;
}): string {
	const day = DAY_LABELS[group.day_of_week] ?? '';
	const freq = frequencyLabels[group.frequency as LessonFrequency] ?? group.frequency;
	const teacher = group.teacher_name ? ` · Docent: ${group.teacher_name}` : '';
	return `${group.name} — ${day} ${group.start_time.slice(0, 5)} · ${group.duration_minutes} min · ${freq} · €${Number(group.price_per_lesson).toFixed(2)}${teacher}`;
}

/** Flat label/value rows for the public signup review step. */
export function buildSignupOverviewRows(input: {
	lessonTypeName: string;
	isGroupLesson: boolean;
	isWaitlist: boolean;
	group: {
		name: string;
		day_of_week: number;
		start_time: string;
		duration_minutes: number;
		frequency: string;
		price_per_lesson: number;
		teacher_name: string | null;
	} | null;
	option: OptionSnapshot | null;
	form: SignupFormFields;
}): SignupOverviewRow[] {
	const rows: SignupOverviewRow[] = [{ label: 'Lessoort', value: input.lessonTypeName }];

	if (input.isGroupLesson) {
		let groupValue = 'Nog geen groep gekozen';
		if (input.isWaitlist) groupValue = 'Wachtlijst';
		else if (input.group) groupValue = formatSignupGroupLine(input.group);
		rows.push({ label: 'Groep', value: groupValue });
	} else if (input.option) {
		rows.push({ label: 'Lesoptie', value: formatSignupOptionLine(input.option) });
	}

	rows.push({
		label: 'Naam',
		value: `${input.form.first_name} ${input.form.last_name}`.trim(),
	});
	rows.push({ label: 'E-mail', value: input.form.email });
	pushIfPresent(rows, 'Telefoon', input.form.phone_number);
	if (input.form.date_of_birth) {
		rows.push({ label: 'Geboortedatum', value: formatDbDateToUi(input.form.date_of_birth) });
	}
	pushIfPresent(rows, 'Ouder/verzorger', input.form.parent_name);
	pushIfPresent(rows, 'E-mail ouder', input.form.parent_email);
	pushIfPresent(rows, 'Telefoon ouder', input.form.parent_phone_number);
	pushIfPresent(rows, 'Opmerkingen', input.form.notes);
	return rows;
}
