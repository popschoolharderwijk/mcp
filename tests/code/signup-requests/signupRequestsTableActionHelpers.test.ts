import { describe, expect, it } from 'bun:test';
import { getSignupRequestRowActionState } from '../../../src/lib/signup-requests/signupRequestsTableActionHelpers';

describe('getSignupRequestRowActionState', () => {
	it('shows actions and trial button for pending requests', () => {
		expect(getSignupRequestRowActionState('pending', 'req-1', null)).toEqual({
			showActions: true,
			showTrialButton: true,
			isBusy: false,
		});
	});

	it('hides trial button for trial scheduled requests', () => {
		expect(getSignupRequestRowActionState('trial_scheduled', 'req-1', null)).toEqual({
			showActions: true,
			showTrialButton: false,
			isBusy: false,
		});
	});

	it('hides actions for approved requests', () => {
		expect(getSignupRequestRowActionState('approved', 'req-1', null)).toEqual({
			showActions: false,
			showTrialButton: false,
			isBusy: false,
		});
	});

	it('marks the matching row as busy', () => {
		expect(getSignupRequestRowActionState('pending', 'req-1', 'req-1')).toEqual({
			showActions: true,
			showTrialButton: true,
			isBusy: true,
		});
	});
});
