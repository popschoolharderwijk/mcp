import { deepEqual } from '@/lib/deepEqual';
import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '@/lib/text/normalizeText';

export interface TeacherProfileInitials {
	initialBio?: string | null;
	initialFirstName?: string | null;
	initialLastName?: string | null;
	initialEmail?: string | null;
	initialPhoneNumber?: string | null;
	initialDateOfBirth?: string | null;
	initialCocIssuedOn?: string | null;
}

export function shouldFetchTeacherProfile(
	initials: TeacherProfileInitials,
	teacherUserId: string,
	userId: string,
): boolean {
	if (
		initials.initialBio ||
		initials.initialFirstName ||
		initials.initialLastName ||
		initials.initialEmail ||
		initials.initialPhoneNumber ||
		initials.initialDateOfBirth
	) {
		return false;
	}
	return !!teacherUserId && !!userId;
}

export function shouldStartProfileLoading(initials: TeacherProfileInitials): boolean {
	return !initials.initialBio && !initials.initialFirstName;
}

export interface TeacherRecord {
	bio: string | null;
	coc_issued_on?: string | null;
}

export interface ProfileRecord {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	phone_number: string | null;
	date_of_birth: string | null;
}

export interface LoadedTeacherProfile {
	bio: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	dateOfBirth: string | null;
	cocIssuedOn: string;
	hasCoc: boolean;
}

export function mapLoadedTeacherProfile(teacher: TeacherRecord | null, profile: ProfileRecord): LoadedTeacherProfile {
	const cocIssuedOn = teacher?.coc_issued_on ?? '';
	return {
		bio: teacher?.bio || '',
		cocIssuedOn,
		hasCoc: Boolean(cocIssuedOn),
		firstName: profile.first_name || '',
		lastName: profile.last_name || '',
		email: profile.email || '',
		phoneNumber: profile.phone_number || '',
		dateOfBirth: profile.date_of_birth,
	};
}

export interface TeacherProfileSaveInput {
	bio: string;
	cocIssuedOn: string;
	hasCoc: boolean;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	dateOfBirth: string | null;
}

/** When VOG is off, persist NULL; when on, require a non-empty issue date. */
export function isTeacherProfileCocValid(input: Pick<TeacherProfileSaveInput, 'hasCoc' | 'cocIssuedOn'>): boolean {
	if (!input.hasCoc) return true;
	return Boolean(input.cocIssuedOn.trim());
}

/** True when normalized teacher/profile save payloads differ from the baseline. */
export function hasTeacherProfileFormChanges(
	initial: TeacherProfileSaveInput,
	current: TeacherProfileSaveInput,
): boolean {
	return !deepEqual(
		{ ...buildTeacherProfileUpdate(initial), ...buildTeacherProfileNameUpdate(initial) },
		{ ...buildTeacherProfileUpdate(current), ...buildTeacherProfileNameUpdate(current) },
	);
}

/** Submit enabled only when editable, dirty, VOG rules pass, and typed date drafts are synced. */
export function canSubmitTeacherProfileForm(
	canEdit: boolean,
	form: Pick<TeacherProfileSaveInput, 'hasCoc' | 'cocIssuedOn'>,
	cocIssuedOnDraftSynced: boolean,
	dateOfBirthDraftSynced: boolean,
	hasChanges: boolean,
): boolean {
	if (!canEdit) return false;
	if (!hasChanges) return false;
	if (!isTeacherProfileCocValid(form)) return false;
	if (form.hasCoc && !cocIssuedOnDraftSynced) return false;
	if (!dateOfBirthDraftSynced) return false;
	return true;
}

export function buildTeacherProfileUpdate(input: TeacherProfileSaveInput) {
	return {
		bio: normalizeTrimmedTextOrNull(input.bio),
		coc_issued_on: input.hasCoc ? input.cocIssuedOn || null : null,
	};
}

export function buildTeacherProfileNameUpdate(input: TeacherProfileSaveInput) {
	return {
		first_name: normalizeCompactTextOrNull(input.firstName),
		last_name: normalizeCompactTextOrNull(input.lastName),
		phone_number: normalizeTrimmedTextOrNull(input.phoneNumber),
		date_of_birth: input.dateOfBirth || null,
	};
}

export function canSaveTeacherProfile(
	teacherUserId: string,
	userId: string,
	canEdit: boolean,
	hasUser: boolean,
): boolean {
	return !!teacherUserId && !!userId && canEdit && hasUser;
}

export interface TeacherProfileFormValues {
	bio: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
	dateOfBirth: string | null;
	cocIssuedOn: string;
	hasCoc: boolean;
}

export function applyTeacherProfileInitials(
	current: TeacherProfileFormValues,
	initials: TeacherProfileInitials,
): TeacherProfileFormValues {
	const cocIssuedOn =
		initials.initialCocIssuedOn !== undefined ? (initials.initialCocIssuedOn ?? '') : current.cocIssuedOn;
	return {
		bio: initials.initialBio !== undefined ? initials.initialBio || '' : current.bio,
		firstName: initials.initialFirstName !== undefined ? initials.initialFirstName || '' : current.firstName,
		lastName: initials.initialLastName !== undefined ? initials.initialLastName || '' : current.lastName,
		email: initials.initialEmail !== undefined ? initials.initialEmail || '' : current.email,
		phoneNumber:
			initials.initialPhoneNumber !== undefined ? initials.initialPhoneNumber || '' : current.phoneNumber,
		dateOfBirth: initials.initialDateOfBirth !== undefined ? initials.initialDateOfBirth : current.dateOfBirth,
		cocIssuedOn,
		hasCoc: initials.initialCocIssuedOn !== undefined ? Boolean(initials.initialCocIssuedOn) : current.hasCoc,
	};
}

export function createTeacherProfileFormState(initials: TeacherProfileInitials): TeacherProfileFormValues {
	const cocIssuedOn = initials.initialCocIssuedOn ?? '';
	return {
		bio: initials.initialBio || '',
		firstName: initials.initialFirstName || '',
		lastName: initials.initialLastName || '',
		email: initials.initialEmail || '',
		phoneNumber: initials.initialPhoneNumber || '',
		dateOfBirth: initials.initialDateOfBirth ?? null,
		cocIssuedOn,
		hasCoc: Boolean(cocIssuedOn),
	};
}
