import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '@/lib/text/normalizeText';

export interface TeacherProfileInitials {
	initialBio?: string | null;
	initialFirstName?: string | null;
	initialLastName?: string | null;
	initialPhoneNumber?: string | null;
	initialHasVog?: boolean | null;
	initialVogExpiresAt?: string | null;
}

export function shouldFetchTeacherProfile(
	initials: TeacherProfileInitials,
	teacherUserId: string,
	userId: string,
): boolean {
	if (initials.initialBio || initials.initialFirstName || initials.initialLastName || initials.initialPhoneNumber) {
		return false;
	}
	return !!teacherUserId && !!userId;
}

export function shouldStartProfileLoading(initials: TeacherProfileInitials): boolean {
	return !initials.initialBio && !initials.initialFirstName;
}

export interface TeacherRecord {
	bio: string | null;
	has_vog?: boolean | null;
	vog_expires_at?: string | null;
}

export interface ProfileRecord {
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
}

export interface LoadedTeacherProfile {
	bio: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	hasVog: boolean;
	vogExpiresAt: string;
}

export function mapLoadedTeacherProfile(teacher: TeacherRecord | null, profile: ProfileRecord): LoadedTeacherProfile {
	return {
		bio: teacher?.bio || '',
		hasVog: teacher?.has_vog ?? false,
		vogExpiresAt: teacher?.vog_expires_at ?? '',
		firstName: profile.first_name || '',
		lastName: profile.last_name || '',
		phoneNumber: profile.phone_number || '',
	};
}

export interface TeacherProfileSaveInput {
	bio: string;
	hasVog: boolean;
	vogExpiresAt: string;
	firstName: string;
	lastName: string;
	phoneNumber: string;
}

export function buildTeacherProfileUpdate(input: TeacherProfileSaveInput) {
	return {
		bio: normalizeTrimmedTextOrNull(input.bio),
		has_vog: input.hasVog,
		vog_expires_at: input.vogExpiresAt || null,
	};
}

export function buildTeacherProfileNameUpdate(input: TeacherProfileSaveInput) {
	return {
		first_name: normalizeCompactTextOrNull(input.firstName),
		last_name: normalizeCompactTextOrNull(input.lastName),
		phone_number: normalizeTrimmedTextOrNull(input.phoneNumber),
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
	phoneNumber: string;
	hasVog: boolean;
	vogExpiresAt: string;
}

export function applyTeacherProfileInitials(
	current: TeacherProfileFormValues,
	initials: TeacherProfileInitials,
): TeacherProfileFormValues {
	return {
		bio: initials.initialBio !== undefined ? initials.initialBio || '' : current.bio,
		firstName: initials.initialFirstName !== undefined ? initials.initialFirstName || '' : current.firstName,
		lastName: initials.initialLastName !== undefined ? initials.initialLastName || '' : current.lastName,
		phoneNumber:
			initials.initialPhoneNumber !== undefined ? initials.initialPhoneNumber || '' : current.phoneNumber,
		hasVog:
			initials.initialHasVog !== undefined && initials.initialHasVog !== null
				? initials.initialHasVog
				: current.hasVog,
		vogExpiresAt:
			initials.initialVogExpiresAt !== undefined ? (initials.initialVogExpiresAt ?? '') : current.vogExpiresAt,
	};
}

export function createTeacherProfileFormState(initials: TeacherProfileInitials): TeacherProfileFormValues {
	return {
		bio: initials.initialBio || '',
		firstName: initials.initialFirstName || '',
		lastName: initials.initialLastName || '',
		phoneNumber: initials.initialPhoneNumber || '',
		hasVog: initials.initialHasVog ?? false,
		vogExpiresAt: initials.initialVogExpiresAt ?? '',
	};
}
