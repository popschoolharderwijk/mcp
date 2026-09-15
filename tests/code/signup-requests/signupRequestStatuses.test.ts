import { describe, expect, it } from 'bun:test';
import { OPEN_SIGNUP_REQUEST_STATUSES } from '../../../src/lib/signup-requests/signupRequestStatuses';

describe('OPEN_SIGNUP_REQUEST_STATUSES', () => {
	it('includes pending and trial_scheduled', () => {
		expect(OPEN_SIGNUP_REQUEST_STATUSES).toEqual(['pending', 'trial_scheduled']);
	});
});
