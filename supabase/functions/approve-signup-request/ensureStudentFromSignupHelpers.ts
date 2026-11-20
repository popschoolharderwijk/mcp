import type { SignupRequestRow } from './types.ts';

export function resolveExistingSignupStudentUserId(
	existingProfile: { user_id: string } | null | undefined,
): string | null {
	return existingProfile?.user_id ?? null;
}

export function shouldUpdateSignupPhoneOnCreate(phoneNumber: string | null): boolean {
	return phoneNumber != null && phoneNumber.length > 0;
}

/** Adult signup only: apply phone on the new owner profile after createUser. */
export function shouldApplySignupPhoneOnCreate(
	reqRow: Pick<SignupRequestRow, 'parent_email' | 'phone_number'>,
): boolean {
	return !isParentOwnedSignup(reqRow) && shouldUpdateSignupPhoneOnCreate(reqRow.phone_number);
}

export function resolveAuthCreateUserId(
	created: { user?: { id: string } | null } | null | undefined,
	createErr: unknown,
): string | null {
	if (createErr || !created?.user) return null;
	return created.user.id;
}

/** Non-empty parent_email → parent owns the login; child is a member. */
export function isParentOwnedSignup(reqRow: Pick<SignupRequestRow, 'parent_email'>): boolean {
	return Boolean(reqRow.parent_email?.trim());
}

/** Login email for auth: parent_email when set, otherwise student email. */
export function resolveSignupLoginEmail(reqRow: Pick<SignupRequestRow, 'email' | 'parent_email'>): string {
	const parentEmail = reqRow.parent_email?.trim();
	if (parentEmail) return parentEmail.toLowerCase();
	return reqRow.email.trim().toLowerCase();
}

function splitParentDisplayName(parentName: string | null): { firstName: string | null; lastName: string | null } {
	const trimmed = parentName?.trim() ?? '';
	if (!trimmed) return { firstName: null, lastName: null };
	return { firstName: trimmed, lastName: null };
}

export function buildSignupAuthCreatePayload(reqRow: SignupRequestRow) {
	const loginEmail = resolveSignupLoginEmail(reqRow);
	if (isParentOwnedSignup(reqRow)) {
		const parentNames = splitParentDisplayName(reqRow.parent_name);
		return {
			email: loginEmail,
			email_confirm: true,
			user_metadata: {
				first_name: parentNames.firstName,
				last_name: parentNames.lastName,
			},
		};
	}
	return {
		email: loginEmail,
		email_confirm: true,
		user_metadata: {
			first_name: reqRow.first_name,
			last_name: reqRow.last_name,
		},
	};
}

export function buildSignupStudentPayload(studentUserId: string, reqRow: SignupRequestRow) {
	return {
		user_id: studentUserId,
		date_of_birth: reqRow.date_of_birth ?? null,
		parent_name: reqRow.parent_name ?? null,
		parent_email: reqRow.parent_email ?? null,
		parent_phone_number: reqRow.parent_phone_number ?? null,
	};
}

export function resolveSignupStudentRowMutation(
	existingStudent: { user_id: string } | null | undefined,
): 'update' | 'insert' {
	return existingStudent ? 'update' : 'insert';
}

export function buildSignupStudentUpdateFields(reqRow: SignupRequestRow) {
	return {
		date_of_birth: reqRow.date_of_birth ?? null,
		parent_name: reqRow.parent_name ?? null,
		parent_email: reqRow.parent_email ?? null,
		parent_phone_number: reqRow.parent_phone_number ?? null,
	};
}

export function buildChildMemberProfileInsert(args: {
	profileId: string;
	firstName: string | null;
	lastName: string | null;
	phoneNumber: string | null;
}) {
	return {
		user_id: args.profileId,
		email: null,
		first_name: args.firstName,
		last_name: args.lastName,
		phone_number: args.phoneNumber,
	};
}

export function buildMemberMembershipInsert(loginUserId: string, profileId: string) {
	return {
		login_user_id: loginUserId,
		profile_id: profileId,
		role: 'member' as const,
	};
}
