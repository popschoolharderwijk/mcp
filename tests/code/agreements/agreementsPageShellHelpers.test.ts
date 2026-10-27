import { describe, expect, it } from 'bun:test';
import {
	buildAgreementDeleteDescription,
	buildAgreementDeleteDialogOpenChangeHandler,
	buildAgreementsNewPath,
} from '../../../src/lib/agreements/agreementsPageShellHelpers';

describe('buildAgreementDeleteDialogOpenChangeHandler', () => {
	it('clears delete dialog when closed', () => {
		let value: unknown = { open: true, agreement: { id: 'a-1' } };
		const handler = buildAgreementDeleteDialogOpenChangeHandler((next) => {
			value = next;
		});

		handler(false);
		expect(value).toBeNull();
	});
});

describe('buildAgreementDeleteDescription', () => {
	it('returns student profile from agreement', () => {
		const student = buildAgreementDeleteDescription({
			id: 'a-1',
			student: { first_name: 'Anna', last_name: 'Bakker', email: '', avatar_url: null },
		} as never);
		expect(student.first_name).toBe('Anna');
		expect(student.last_name).toBe('Bakker');
	});

	it('returns empty profile when agreement is missing', () => {
		expect(buildAgreementDeleteDescription(null)).toEqual({ first_name: null, last_name: null });
	});
});

describe('buildAgreementsNewPath', () => {
	it('returns the base new-agreement path without a student', () => {
		expect(buildAgreementsNewPath()).toBe('/agreements/new');
		expect(buildAgreementsNewPath(null)).toBe('/agreements/new');
	});

	it('includes studentUserId query when a student is provided', () => {
		expect(buildAgreementsNewPath('student-1')).toBe('/agreements/new?studentUserId=student-1');
	});
});
