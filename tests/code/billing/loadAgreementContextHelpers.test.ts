import { describe, expect, it } from 'bun:test';
import {
	resolveAgreementInactiveFailure,
	resolveAgreementLoadFailure,
	resolveAgreementPreProfileFailure,
	resolveAgreementProfileFailure,
} from '../../../supabase/functions/create-subscription-checkout/loadAgreementContextHelpers';

const agreement = {
	id: 'agr-1',
	student_user_id: 'student-1',
	is_active: true,
};

describe('resolveAgreementLoadFailure', () => {
	it('returns not found when agreement is missing', () => {
		expect(resolveAgreementLoadFailure(null, 'db error')).toEqual({
			status: 404,
			error: 'Lesovereenkomst niet gevonden',
		});
	});

	it('returns null when agreement exists', () => {
		expect(resolveAgreementLoadFailure(agreement, undefined)).toBeNull();
	});
});

describe('resolveAgreementInactiveFailure', () => {
	it('returns conflict when agreement is inactive', () => {
		expect(resolveAgreementInactiveFailure({ ...agreement, is_active: false })).toEqual({
			status: 409,
			error: 'Lesovereenkomst is niet actief',
		});
	});

	it('returns null when agreement is active', () => {
		expect(resolveAgreementInactiveFailure(agreement)).toBeNull();
	});
});

describe('resolveAgreementPreProfileFailure', () => {
	it('returns load failure before inactive failure', () => {
		expect(resolveAgreementPreProfileFailure(null, 'db error')).toEqual({
			status: 404,
			error: 'Lesovereenkomst niet gevonden',
		});
	});

	it('returns inactive failure when agreement is inactive', () => {
		expect(resolveAgreementPreProfileFailure({ ...agreement, is_active: false }, undefined)).toEqual({
			status: 409,
			error: 'Lesovereenkomst is niet actief',
		});
	});

	it('returns null when agreement is active', () => {
		expect(resolveAgreementPreProfileFailure(agreement, undefined)).toBeNull();
	});
});

describe('resolveAgreementProfileFailure', () => {
	it('returns error when profile email is missing', () => {
		expect(resolveAgreementProfileFailure(null)).toEqual({
			status: 400,
			error: 'Geen e-mail bekend voor leerling',
		});
	});

	it('returns null when profile email exists', () => {
		expect(
			resolveAgreementProfileFailure({
				email: 'jan@test.nl',
				first_name: 'Jan',
				last_name: 'Leerling',
			}),
		).toBeNull();
	});
});
