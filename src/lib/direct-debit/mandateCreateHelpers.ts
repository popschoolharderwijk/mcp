import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidIban, normalizeIban } from '@/lib/direct-debit/iban';

export interface MandateFormInput {
	studentId: string | null;
	iban: string;
	bic: string;
	holder: string;
	signedAt: string;
	method: 'digital' | 'paper';
}

export type MandateFormValidationError = 'missing-fields' | 'invalid-iban';

function validateMandateFormInput(input: MandateFormInput): {
	error: MandateFormValidationError | null;
	normalizedIban: string;
} {
	if (!input.studentId || !input.iban || !input.holder) {
		return { error: 'missing-fields', normalizedIban: '' };
	}
	const normalizedIban = normalizeIban(input.iban);
	if (!isValidIban(normalizedIban)) {
		return { error: 'invalid-iban', normalizedIban };
	}
	return { error: null, normalizedIban };
}

function buildMandateInsertPayload(input: MandateFormInput, mandateReference: string, normalizedIban: string) {
	return {
		student_user_id: input.studentId as string,
		mandate_reference: mandateReference,
		iban: normalizedIban,
		bic: input.bic || null,
		account_holder: input.holder,
		signed_at: input.signedAt,
		signature_method: input.method,
		status: 'active' as const,
		sequence_type: 'FRST' as const,
	};
}

export function resolveHolderFromStudentSelection(
	currentHolder: string,
	firstName: string | null | undefined,
	lastName: string | null | undefined,
): string {
	if (currentHolder) return currentHolder;
	const name = [firstName, lastName].filter(Boolean).join(' ').trim();
	return name;
}

export function resolveMandateValidationToast(error: MandateFormValidationError): string {
	if (error === 'missing-fields') return 'Vul leerling, IBAN en rekeninghouder in';
	return 'Ongeldig IBAN';
}

export type MandateCreateResult =
	| { ok: true }
	| { ok: false; kind: 'validation'; error: MandateFormValidationError }
	| { ok: false; kind: 'reference'; message: string }
	| { ok: false; kind: 'insert'; message: string };

async function fetchNextMandateReference(
	supabase: SupabaseClient,
): Promise<{ ok: true; reference: string } | { ok: false; message: string }> {
	const { data, error } = await supabase.rpc('next_mandate_reference');
	if (error || !data) {
		return { ok: false, message: error?.message ?? 'onbekend' };
	}
	return { ok: true, reference: data as string };
}

async function insertSepaMandate(
	supabase: SupabaseClient,
	payload: ReturnType<typeof buildMandateInsertPayload>,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error } = await supabase.from('sepa_mandates').insert(payload);
	if (error) {
		return { ok: false, message: error.message };
	}
	return { ok: true };
}

export async function executeNewMandateCreate(
	supabase: SupabaseClient,
	input: MandateFormInput,
): Promise<MandateCreateResult> {
	const validation = validateMandateFormInput(input);
	if (validation.error) {
		return { ok: false, kind: 'validation', error: validation.error };
	}

	const referenceResult = await fetchNextMandateReference(supabase);
	if (referenceResult.ok === false) {
		return { ok: false, kind: 'reference', message: referenceResult.message };
	}

	const insertResult = await insertSepaMandate(
		supabase,
		buildMandateInsertPayload(input, referenceResult.reference, validation.normalizedIban),
	);
	if (insertResult.ok === false) {
		return { ok: false, kind: 'insert', message: insertResult.message };
	}

	return { ok: true };
}
