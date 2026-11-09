import type { SignupRequest } from './types.ts';

export function buildInsertPayload(body: SignupRequest, optionId: string | null) {
	return {
		lesson_type_id: body.lesson_type_id,
		lesson_group_id: body.lesson_group_id ?? null,
		lesson_type_option_id: optionId,
		first_name: body.first_name.trim(),
		last_name: body.last_name.trim(),
		email: body.email.trim().toLowerCase(),
		phone_number: body.phone_number?.trim() || null,
		date_of_birth: body.date_of_birth || null,
		parent_name: body.parent_name?.trim() || null,
		parent_email: body.parent_email?.trim().toLowerCase() || null,
		parent_phone_number: body.parent_phone_number?.trim() || null,
		notes: body.notes?.trim() || null,
		status: 'pending' as const,
	};
}
