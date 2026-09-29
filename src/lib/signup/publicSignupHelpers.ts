import type { OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import { isValidIban, normalizeIban } from '@/lib/direct-debit/iban';

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

export interface SignupSepaFields {
	enabled: boolean;
	iban: string;
	holder: string;
	bic: string;
	consent: boolean;
}

export function validateSepaFields(sepa: SignupSepaFields): string | null {
	if (!sepa.enabled) return null;
	if (!isValidIban(sepa.iban)) return 'Ongeldig IBAN';
	if (!sepa.holder.trim()) return 'Vul de rekeninghouder in';
	if (!sepa.consent) return 'Bevestig de SEPA-machtiging om door te gaan';
	return null;
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
	sepa: SignupSepaFields,
	groupId: string | null,
	optionId: string | null,
) {
	return {
		lesson_type_id: selectedType.id,
		lesson_group_id: groupId,
		lesson_type_option_id: optionId,
		...form,
		sepa_iban: sepa.enabled ? normalizeIban(sepa.iban) : null,
		sepa_account_holder: sepa.enabled ? sepa.holder.trim() : null,
		sepa_bic: sepa.enabled && sepa.bic.trim() ? sepa.bic.trim().toUpperCase() : null,
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
	sepa: SignupSepaFields;
}) {
	const groupId = resolveSignupGroupId(params.selectedType, params.selectedGroupId);
	const optionId = params.selectedType.is_group_lesson
		? null
		: resolveLessonTypeOptionId(params.lessonTypeOptions, params.selectedOption);
	return buildSignupRequestBody(params.selectedType, params.form, params.sepa, groupId, optionId);
}

export type PublicSignupSubmitOutcome =
	| { kind: 'invoke-error'; message: string }
	| { kind: 'response-error'; message: string }
	| { kind: 'success' };

export async function executePublicSignupSubmit(params: {
	selectedType: SignupLessonType;
	selectedGroupId: string | 'waitlist' | null;
	selectedOption: OptionSnapshot | null;
	lessonTypeOptions: LessonTypeOptionMatch[];
	form: SignupFormFields;
	sepa: SignupSepaFields;
	invoke: (body: ReturnType<typeof buildSignupRequestBody>) => Promise<{
		data: unknown;
		error: { message?: string } | null;
	}>;
	getInvokeErrorMessage: (error: unknown, options: { fallback: string }) => Promise<string>;
}): Promise<PublicSignupSubmitOutcome> {
	const body = resolvePublicSignupSubmitPayload({
		selectedType: params.selectedType,
		selectedGroupId: params.selectedGroupId,
		selectedOption: params.selectedOption,
		lessonTypeOptions: params.lessonTypeOptions,
		form: params.form,
		sepa: params.sepa,
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

export function isStep2NextDisabled(
	isGroupLesson: boolean,
	selectedGroupId: string | 'waitlist' | null,
	lessonTypeOptionsCount: number,
	hasSelectedOption: boolean,
): boolean {
	if (isGroupLesson) return !selectedGroupId;
	return lessonTypeOptionsCount > 0 && !hasSelectedOption;
}
