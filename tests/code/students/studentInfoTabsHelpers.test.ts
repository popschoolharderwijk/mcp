import { describe, expect, it } from 'bun:test';
import {
	resolveStudentDetailAccess,
	resolveStudentInfoTabsDefaultValue,
} from '../../../src/lib/students/studentInfoTabsHelpers';

describe('resolveStudentInfoTabsDefaultValue', () => {
	it('opens profile for privileged users', () => {
		expect(resolveStudentInfoTabsDefaultValue(true)).toBe('profile');
	});

	it('opens agreements for non-privileged users', () => {
		expect(resolveStudentInfoTabsDefaultValue(false)).toBe('agreements');
	});
});

describe('resolveStudentDetailAccess', () => {
	it('allows privileged users to view and edit agenda', () => {
		expect(resolveStudentDetailAccess(true, false)).toEqual({ canView: true, canEditAgenda: true });
	});

	it('allows teachers to view but not edit agenda', () => {
		expect(resolveStudentDetailAccess(false, true)).toEqual({ canView: true, canEditAgenda: false });
	});

	it('denies users without privileged or teacher access', () => {
		expect(resolveStudentDetailAccess(false, false)).toEqual({ canView: false, canEditAgenda: false });
	});
});
