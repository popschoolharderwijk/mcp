import { describe, expect, it } from 'bun:test';
import {
	mergeStudentWithProfile,
	shouldLoadStudentInfoModal,
	shouldResetStudentInfoModal,
} from '../../../src/lib/students/studentInfoModalHelpers';

const studentRecord = {
	id: 'student-1',
	user_id: 'user-1',
	date_of_birth: '2010-01-01',
	parent_name: 'Parent',
	parent_email: 'parent@example.com',
	parent_phone_number: '0612345678',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
};

const profileRecord = {
	user_id: 'user-1',
	email: 'student@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
	avatar_url: null,
	phone_number: '0687654321',
};

describe('mergeStudentWithProfile', () => {
	it('merges student and profile fields into one student object', () => {
		const merged = mergeStudentWithProfile(studentRecord, profileRecord);
		expect(merged.user_id).toBe('user-1');
		expect(merged.email).toBe('student@example.com');
		expect(merged.first_name).toBe('Anna');
		expect(merged.last_name).toBe('Bakker');
		expect(merged.parent_name).toBe('Parent');
		expect(merged.phone_number).toBe('0687654321');
	});
});

describe('student info modal load gates', () => {
	it('loads when open with a student', () => {
		expect(shouldLoadStudentInfoModal(true, { user_id: 'user-1' })).toBe(true);
	});

	it('resets when closed or student is missing', () => {
		expect(shouldResetStudentInfoModal(false, { user_id: 'user-1' })).toBe(true);
		expect(shouldResetStudentInfoModal(true, null)).toBe(true);
	});
});
