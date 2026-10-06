import {
	normalizeCompactText,
	normalizeCompactTextOrNull,
	normalizeTrimmedText,
	normalizeTrimmedTextOrNull,
} from '@/lib/text/normalizeText';
import type { Student } from '@/types/students';

export interface StudentFormState {
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string;
	date_of_birth: string | null;
	parent_name: string;
	parent_email: string;
	parent_phone_number: string;
	debtor_info_same_as_student: boolean;
	debtor_name: string;
	debtor_address: string;
	debtor_postal_code: string;
	debtor_city: string;
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
	debtor_info_same_as_student: true,
	debtor_name: '',
	debtor_address: '',
	debtor_postal_code: '',
	debtor_city: '',
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
		debtor_info_same_as_student: form.debtor_info_same_as_student,
		debtor_name: form.debtor_info_same_as_student ? null : normalizeCompactTextOrNull(form.debtor_name),
		debtor_address: form.debtor_info_same_as_student ? null : normalizeCompactTextOrNull(form.debtor_address),
		debtor_postal_code: form.debtor_info_same_as_student
			? null
			: normalizeCompactTextOrNull(form.debtor_postal_code),
		debtor_city: form.debtor_info_same_as_student ? null : normalizeCompactTextOrNull(form.debtor_city),
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
		debtor_info_same_as_student: student.debtor_info_same_as_student,
		debtor_name: normalizeCompactText(student.debtor_name ?? ''),
		debtor_address: normalizeCompactText(student.debtor_address ?? ''),
		debtor_postal_code: normalizeCompactText(student.debtor_postal_code ?? ''),
		debtor_city: normalizeCompactText(student.debtor_city ?? ''),
	};
}
