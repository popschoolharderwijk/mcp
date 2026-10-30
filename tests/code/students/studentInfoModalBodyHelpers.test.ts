import { describe, expect, it } from 'bun:test';
import { buildStudentInfoModalView } from '../../../src/lib/students/studentInfoModalBodyHelpers';

const fullData = {
	id: 'student-1',
	user_id: 'user-1',
	date_of_birth: '2010-01-01',
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
	email: 'student@example.com',
	first_name: 'Anna',
	last_name: 'Bakker',
	avatar_url: null,
	phone_number: null,
};

describe('buildStudentInfoModalView', () => {
	it('shows privileged block and date of birth for privileged viewers with full data', () => {
		expect(buildStudentInfoModalView(fullData, true)).toEqual({
			dateOfBirth: '2010-01-01',
			showDateOfBirth: true,
			showPrivilegedBlock: true,
			showLimitedAccessNotice: false,
		});
	});

	it('hides privileged block and shows limited-access notice for non-privileged viewers', () => {
		expect(buildStudentInfoModalView(fullData, false)).toEqual({
			dateOfBirth: '2010-01-01',
			showDateOfBirth: true,
			showPrivilegedBlock: false,
			showLimitedAccessNotice: true,
		});
	});

	it('hides privileged block when privileged viewer has no full data', () => {
		expect(buildStudentInfoModalView(null, true)).toEqual({
			dateOfBirth: null,
			showDateOfBirth: false,
			showPrivilegedBlock: false,
			showLimitedAccessNotice: false,
		});
	});

	it('hides date of birth when full data has no date_of_birth', () => {
		expect(buildStudentInfoModalView({ ...fullData, date_of_birth: null }, true)).toEqual({
			dateOfBirth: null,
			showDateOfBirth: false,
			showPrivilegedBlock: true,
			showLimitedAccessNotice: false,
		});
	});
});
