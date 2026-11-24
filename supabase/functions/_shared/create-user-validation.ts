export interface CreateUserRequestBody {
	email: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	date_of_birth?: string | null;
	role?: 'site_admin' | 'admin' | 'staff';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCreateUserEmail(email: string): boolean {
	return EMAIL_RE.test(email);
}

export function canAssignCreateUserRole(
	requesterRole: string | null | undefined,
	targetRole: CreateUserRequestBody['role'],
): boolean {
	if (!requesterRole) return false;
	if (requesterRole !== 'admin' && requesterRole !== 'site_admin') return false;
	if (requesterRole === 'admin' && targetRole === 'site_admin') return false;
	return true;
}

export function isDuplicateCreateUserError(message: string): boolean {
	return message.includes('already') || message.includes('duplicate');
}
