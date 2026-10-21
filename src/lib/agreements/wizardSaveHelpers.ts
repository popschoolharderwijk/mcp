import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { sendAgreementCreatedMails } from '@/lib/email/sendAgreementCreatedMails';
import type { AgreementTableRow, LessonFrequency } from '@/types/lesson-agreements';

export type WizardSaveForm = {
	studentUserId: string | null;
	lessonTypeId: string | null;
	teacherUserId: string | null;
	slot: SlotWithStatus | null;
	partnerStudentUserId: string | null;
	selectedOptionSnapshot: {
		id: string;
		duration_minutes: number;
		frequency: LessonFrequency;
	} | null;
	startDate: string;
	endDate: string;
	paymentMethod: 'stripe' | 'sepa' | 'manual';
	sepaMandateId: string | null;
	studentDateOfBirth: string | null;
	partnerDateOfBirth: string | null;
	studentDateOfBirthInput: string;
	partnerDateOfBirthInput: string;
};

type ValidatedWizardSaveForm = WizardSaveForm & {
	studentUserId: string;
	lessonTypeId: string;
	teacherUserId: string;
	slot: SlotWithStatus;
};

type ValidatedDuoSaveForm = ValidatedWizardSaveForm & {
	partnerStudentUserId: string;
	selectedOptionSnapshot: NonNullable<WizardSaveForm['selectedOptionSnapshot']>;
};

type AgreementUpsertPayload = {
	teacher_user_id: string;
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	payment_method: WizardSaveForm['paymentMethod'];
	sepa_mandate_id: string | null;
	lesson_type_option_id: string | null;
};

type AgreementUpsertResult = {
	data: { id: string } | null;
	error: { message: string } | null;
};

function normalizeSlotStartTime(startTime: string): string {
	return startTime.includes(':') ? startTime : `${startTime}:00`;
}

function validateRequiredSaveFields(form: WizardSaveForm): form is ValidatedWizardSaveForm {
	if (
		!form.studentUserId ||
		!form.lessonTypeId ||
		!form.teacherUserId ||
		!form.slot ||
		form.slot.status === 'occupied'
	) {
		toast.error('Selecteer alle verplichte velden');
		return false;
	}
	return true;
}

function validateDuoSaveForm(form: ValidatedWizardSaveForm): form is ValidatedDuoSaveForm {
	if (!form.partnerStudentUserId || form.partnerStudentUserId === form.studentUserId) {
		toast.error('Kies een duo-partner (verschillende leerling)');
		return false;
	}
	if (!form.selectedOptionSnapshot) {
		toast.error('Selecteer een lesoptie');
		return false;
	}
	return true;
}

function validateSepaMandate(form: WizardSaveForm): boolean {
	if (form.paymentMethod === 'sepa' && !form.sepaMandateId) {
		toast.error('Kies een SEPA-mandaat of een andere betaalmethode');
		return false;
	}
	return true;
}

/** Date of birth to use: the stored one, else the one entered in the wizard. */
export function resolveEffectiveDateOfBirth(stored: string | null, input: string): string | null {
	return stored ?? (input.trim() || null);
}

/**
 * SEPA and Stripe need a date of birth (under 21 is VAT exempt, 21+ is not); without it the
 * fee cannot be determined. Duo agreements default to Stripe, so both students need one.
 */
export function resolveMissingDateOfBirthMessage(form: WizardSaveForm, isDuo: boolean): string | null {
	const needsDob = isDuo || form.paymentMethod === 'sepa' || form.paymentMethod === 'stripe';
	if (!needsDob) return null;
	if (!resolveEffectiveDateOfBirth(form.studentDateOfBirth, form.studentDateOfBirthInput)) {
		return 'Vul de geboortedatum van de leerling in. Die is nodig om het juiste tarief en de btw te bepalen.';
	}
	if (isDuo && !resolveEffectiveDateOfBirth(form.partnerDateOfBirth, form.partnerDateOfBirthInput)) {
		return 'Vul de geboortedatum van de duo-partner in. Die is nodig om het juiste tarief en de btw te bepalen.';
	}
	return null;
}

/** Store dates of birth entered in the wizard (the student row exists once an agreement exists). */
async function saveEnteredDatesOfBirth(entries: { userId: string | null; stored: string | null; input: string }[]) {
	for (const entry of entries) {
		if (!entry.userId || entry.stored || !entry.input.trim()) continue;
		// RPC: staff may create agreements but not edit students; it only fills an empty date.
		const { error } = await supabase.rpc('set_student_date_of_birth_if_missing', {
			p_student_user_id: entry.userId,
			p_date_of_birth: entry.input.trim(),
		});
		if (error) toast.warning('Geboortedatum kon niet worden opgeslagen', { description: error.message });
	}
}

function buildAgreementUpsertPayload(form: ValidatedWizardSaveForm, timeValue: string): AgreementUpsertPayload {
	return {
		teacher_user_id: form.teacherUserId,
		day_of_week: form.slot.day_of_week,
		start_time: timeValue,
		start_date: form.startDate,
		end_date: form.endDate || null,
		payment_method: form.paymentMethod,
		sepa_mandate_id: form.paymentMethod === 'sepa' ? form.sepaMandateId : null,
		lesson_type_option_id: form.selectedOptionSnapshot?.id ?? null,
	};
}

async function createAndNotifyDuoAgreements(params: {
	form: ValidatedDuoSaveForm;
	fromRequestId: string | null;
	navigate: NavigateFunction;
}): Promise<boolean> {
	const { form, fromRequestId, navigate } = params;

	const { data: duoData, error: duoErr } = await supabase.functions.invoke<{
		agreement_ids: string[];
		duo_pair_id: string;
		confirmation_sent: boolean;
	}>('create-duo-agreements', {
		body: buildCreateDuoAgreementsBody(form, fromRequestId),
	});

	if (duoErr || !duoData?.agreement_ids?.length) {
		toast.error(duoErr?.message ?? 'Fout bij aanmaken duo-overeenkomsten');
		return false;
	}

	await saveEnteredDatesOfBirth([
		{ userId: form.studentUserId, stored: form.studentDateOfBirth, input: form.studentDateOfBirthInput },
		{ userId: form.partnerStudentUserId, stored: form.partnerDateOfBirth, input: form.partnerDateOfBirthInput },
	]);

	if (duoData.confirmation_sent) toast.success('Duo-overeenkomsten toegevoegd');
	else toast.warning('Overeenkomsten opgeslagen, maar de mail is niet verstuurd');
	navigate('/agreements');
	return true;
}

async function upsertWizardAgreement(
	agreement: AgreementTableRow | null,
	form: ValidatedWizardSaveForm,
	payload: AgreementUpsertPayload,
	fromRequestId: string | null,
): Promise<AgreementUpsertResult> {
	if (agreement) {
		return supabase.from('lesson_agreements').update(payload).eq('id', agreement.id).select('id').maybeSingle();
	}

	return supabase
		.from('lesson_agreements')
		.insert({
			...payload,
			student_user_id: form.studentUserId,
			lesson_type_id: form.lessonTypeId,
			duration_minutes: form.selectedOptionSnapshot?.duration_minutes ?? 30,
			frequency: form.selectedOptionSnapshot?.frequency ?? 'weekly',
			is_active: true,
			signup_source: fromRequestId ? 'public_form' : 'staff',
		})
		.select('id')
		.single();
}

async function handleNewAgreementSideEffects(params: {
	agreementId: string;
	fromRequestId: string | null;
	fromTrialId: string | null;
}): Promise<boolean> {
	const { agreementId, fromRequestId, fromTrialId } = params;

	if (fromRequestId) {
		await supabase
			.from('lesson_signup_requests')
			.update({
				status: 'approved',
				processed_at: new Date().toISOString(),
				created_agreement_id: agreementId,
			})
			.eq('id', fromRequestId);
	}

	if (fromTrialId) {
		await supabase
			.from('trial_lessons')
			.update({
				status: 'converted',
				admin_processed_at: new Date().toISOString(),
				created_agreement_id: agreementId,
			})
			.eq('id', fromTrialId);
	}

	// Confirmation emails to student and teacher (best-effort; does not block the flow).
	const mail = await sendAgreementCreatedMails(agreementId);
	return mail.studentSent;
}

function showAgreementSavedToast(params: {
	isEdit: boolean;
	isNew: boolean;
	paymentMethod: WizardSaveForm['paymentMethod'];
}): void {
	const { isEdit, isNew, paymentMethod } = params;

	if (isNew && paymentMethod === 'sepa') {
		toast.success('Overeenkomst toegevoegd — SEPA-incasso gekoppeld');
		return;
	}
	if (isNew && paymentMethod === 'manual') {
		toast.success('Overeenkomst toegevoegd — handmatige facturatie');
		return;
	}
	toast.success(isEdit ? 'Overeenkomst bijgewerkt' : 'Overeenkomst toegevoegd');
}

function getAgreementSavedNavigatePath(fromRequestId: string | null, fromTrialId: string | null): string {
	if (fromRequestId) return '/signup-requests';
	if (fromTrialId) return '/trial-lessons';
	return '/agreements';
}

function resolveWizardAgreementUpsertErrorMessage(message: string): string {
	return message.includes('unique') ? 'Deze combinatie bestaat al' : 'Fout bij opslagen';
}

export type WizardAgreementSaveParams = {
	form: WizardSaveForm;
	agreement: AgreementTableRow | null;
	isDuoLesson: boolean;
	fromRequestId: string | null;
	fromTrialId: string | null;
	navigate: NavigateFunction;
};

export async function saveWizardAgreement(params: WizardAgreementSaveParams): Promise<boolean> {
	const { form, agreement, isDuoLesson, fromRequestId, fromTrialId, navigate } = params;

	if (!validateRequiredSaveFields(form)) return false;

	const timeValue = normalizeSlotStartTime(form.slot.start_time);

	const dobMessage = resolveMissingDateOfBirthMessage(form, !agreement && isDuoLesson);
	if (dobMessage) {
		toast.error(dobMessage);
		return false;
	}

	if (!agreement && isDuoLesson) {
		if (!validateDuoSaveForm(form)) return false;
		return createAndNotifyDuoAgreements({ form, fromRequestId, navigate });
	}

	if (!validateSepaMandate(form)) return false;

	const payload = buildAgreementUpsertPayload(form, timeValue);
	const insertResult = await upsertWizardAgreement(agreement, form, payload, fromRequestId);

	if (insertResult.error) {
		toast.error(resolveWizardAgreementUpsertErrorMessage(insertResult.error.message));
		return false;
	}

	const isNew = !agreement;
	const agreementId = insertResult.data?.id;
	await saveEnteredDatesOfBirth([
		{ userId: form.studentUserId, stored: form.studentDateOfBirth, input: form.studentDateOfBirthInput },
	]);
	const mailSent = isNew && agreementId ? await handleNewAgreementSideEffects({ agreementId, fromRequestId, fromTrialId }) : true;
	if (!mailSent) toast.warning('Overeenkomst opgeslagen, maar de mail is niet verstuurd');
	else showAgreementSavedToast({ isEdit: !isNew, isNew, paymentMethod: form.paymentMethod });
	navigate(getAgreementSavedNavigatePath(fromRequestId, fromTrialId));
	return true;
}

function resolveDuoSignupSource(fromRequestId: string | null): 'public_form' | 'staff_duo' {
	return fromRequestId ? 'public_form' : 'staff_duo';
}

function buildCreateDuoAgreementsBody(form: ValidatedDuoSaveForm, fromRequestId: string | null) {
	const timeValue = normalizeSlotStartTime(form.slot.start_time);
	const snapshot = form.selectedOptionSnapshot;
	return {
		student_user_id_a: form.studentUserId,
		student_user_id_b: form.partnerStudentUserId,
		teacher_user_id: form.teacherUserId,
		lesson_type_id: form.lessonTypeId,
		day_of_week: form.slot.day_of_week,
		start_time: timeValue,
		duration_minutes: snapshot.duration_minutes,
		frequency: snapshot.frequency,
		lesson_type_option_id: snapshot.id,
		start_date: form.startDate,
		end_date: form.endDate || null,
		signup_source: resolveDuoSignupSource(fromRequestId),
	};
}
