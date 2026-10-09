import { describe, expect, it } from 'bun:test';
import { hasConfirmStepSelectedUser } from '../../../src/lib/agreements/confirmStepSingleViewHelpers';

describe('hasConfirmStepSelectedUser', () => {
	it('returns true when user is selected', () => {
		expect(hasConfirmStepSelectedUser({ user_id: 'student-1' } as never)).toBe(true);
	});

	it('returns false when user is null', () => {
		expect(hasConfirmStepSelectedUser(null)).toBe(false);
	});
});
