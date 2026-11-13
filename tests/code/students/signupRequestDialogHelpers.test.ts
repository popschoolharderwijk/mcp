import { describe, expect, it } from 'bun:test';
import {
	hasSignupRequestParentInfo,
	resolveSignupRequestStatusVariant,
} from '../../../src/lib/students/signupRequestDialogHelpers';

const baseRequest = {
	id: 'req-1',
	first_name: 'Jan',
	last_name: 'Jansen',
	email: 'jan@example.com',
	phone_number: null,
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	date_of_birth: null,
	notes: null,
	status: 'pending' as const,
	created_at: '2026-01-01',
	processed_at: null,
	lesson_type_name: 'Piano',
	lesson_group_name: null,
};

describe('resolveSignupRequestStatusVariant', () => {
	it('returns default for pending requests', () => {
		expect(resolveSignupRequestStatusVariant('pending')).toBe('default');
	});

	it('returns secondary for approved requests', () => {
		expect(resolveSignupRequestStatusVariant('approved')).toBe('secondary');
	});

	it('returns outline for rejected requests', () => {
		expect(resolveSignupRequestStatusVariant('rejected')).toBe('outline');
	});
});

describe('hasSignupRequestParentInfo', () => {
	it('returns false when parent fields are empty', () => {
		expect(hasSignupRequestParentInfo(baseRequest)).toBe(false);
	});

	it('returns true when parent email exists', () => {
		expect(hasSignupRequestParentInfo({ ...baseRequest, parent_email: 'ouder@example.com' })).toBe(true);
	});
});
