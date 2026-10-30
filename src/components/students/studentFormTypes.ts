import { emptyProfileAddressForm, profileAddressFormFromFields } from '@/lib/profile/profileAddressHelpers';
import {
	normalizeCompactText,
	normalizeCompactTextOrNull,
	normalizeTrimmedText,
	normalizeTrimmedTextOrNull,
} from '@/lib/text/normalizeText';
import type { ProfileAddressFormState } from '@/types/profile-address';
import type { Student } from '@/types/students';

export interface StudentFormState extends ProfileAddressFormState {
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string;
	date_of_birth: string | null;
	parent_name: string;
	parent_email: string;
	parent_phone_number: string;
}

export type StudentFormMode = 'new-user' | 'existing-user';

export const emptyStudentForm: StudentFormState = {
	email: '',
	first_name: '',
	last_name: '',
	phone_number: '',
	date_of_birth: null,
	parent_name: '',
	parent_email: '',
	parent_phone_number: '',
	...emptyProfileAddressForm,
};

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
	return /^[0-9]{10}$/.test(phone.replace(/\s/g, ''));
}

export function studentRecordFields(form: StudentFormState) {
	return {
		date_of_birth: form.date_of_birth || null,
		parent_name: normalizeCompactTextOrNull(form.parent_name),
		parent_email: normalizeTrimmedTextOrNull(form.parent_email),
		parent_phone_number: normalizeTrimmedTextOrNull(form.parent_phone_number),
	};
}

export function studentFormFromStudent(student: Student): StudentFormState {
	return {
		email: normalizeTrimmedText(student.email ?? ''),
		first_name: normalizeCompactText(student.first_name ?? ''),
		last_name: normalizeCompactText(student.last_name ?? ''),
		phone_number: normalizeTrimmedText(student.phone_number ?? ''),
		date_of_birth: student.date_of_birth ?? null,
		parent_name: normalizeCompactText(student.parent_name ?? ''),
		parent_email: normalizeTrimmedText(student.parent_email ?? ''),
		parent_phone_number: normalizeTrimmedText(student.parent_phone_number ?? ''),
		...profileAddressFormFromFields(student),
	};
}
