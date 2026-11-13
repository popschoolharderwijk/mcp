import { describe, expect, it } from 'bun:test';
import {
	getSignupRequestRowActionState,
	listSignupRequestDialogActions,
} from '../../../src/lib/signup-requests/signupRequestsTableActionHelpers';

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

describe('listSignupRequestDialogActions', () => {
	it('offers only delete when no row is open', () => {
		expect(listSignupRequestDialogActions(null, null)).toEqual([{ id: 'delete', disabled: false }]);
	});

	it('offers delete, trial, and process for a pending request', () => {
		expect(listSignupRequestDialogActions({ status: 'pending', id: 'req-1' }, null)).toEqual([
			{ id: 'delete', disabled: false },
			{ id: 'trial', disabled: false },
			{ id: 'process', disabled: false },
		]);
	});

	it('hides trial after a trial is scheduled', () => {
		expect(listSignupRequestDialogActions({ status: 'trial_scheduled', id: 'req-1' }, null)).toEqual([
			{ id: 'delete', disabled: false },
			{ id: 'process', disabled: false },
		]);
	});

	it('offers only delete once the request is approved', () => {
		expect(listSignupRequestDialogActions({ status: 'approved', id: 'req-1' }, null)).toEqual([
			{ id: 'delete', disabled: false },
		]);
	});

	it('disables every action while that row is busy', () => {
		expect(listSignupRequestDialogActions({ status: 'pending', id: 'req-1' }, 'req-1')).toEqual([
			{ id: 'delete', disabled: true },
			{ id: 'trial', disabled: true },
			{ id: 'process', disabled: true },
		]);
	});
});
