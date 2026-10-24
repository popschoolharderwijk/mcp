import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createClientAs } from '../../db';
import { unwrap, unwrapError } from '../../utils';
import { type DatabaseState, setupDatabaseStateVerification } from '../db-state';
import { fixtures } from '../fixtures';
import { TestUsers } from '../test-users';

let initialState: DatabaseState;
const { setupState, verifyState } = setupDatabaseStateVerification();

beforeAll(async () => {
	initialState = await setupState();
});

afterAll(async () => {
	await verifyState(initialState);
});

const { requireProfile } = fixtures;

describe('Constraints: phone_number validation', () => {
	it('allows valid 10-digit phone number', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const originalPhoneNumber = profile.phone_number;

		const data = unwrap(
			await db.from('profiles').update({ phone_number: '0612345678' }).eq('user_id', profile.user_id).select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].phone_number).toBe('0612345678');

		unwrap(
			await db
				.from('profiles')
				.update({ phone_number: originalPhoneNumber })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('allows NULL phone number', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const originalPhoneNumber = profile.phone_number;

		const data = unwrap(
			await db.from('profiles').update({ phone_number: null }).eq('user_id', profile.user_id).select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].phone_number).toBeNull();

		unwrap(
			await db
				.from('profiles')
				.update({ phone_number: originalPhoneNumber })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});

	it('rejects phone number with less than 10 digits', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		unwrapError(
			await db.from('profiles').update({ phone_number: '061234567' }).eq('user_id', profile.user_id).select(),
		);
	});

	it('rejects phone number with more than 10 digits', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		unwrapError(
			await db.from('profiles').update({ phone_number: '06123456789' }).eq('user_id', profile.user_id).select(),
		);
	});

	it('rejects phone number with non-numeric characters', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		unwrapError(
			await db.from('profiles').update({ phone_number: '06-12345678' }).eq('user_id', profile.user_id).select(),
		);
	});

	it('rejects phone number with spaces', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);

		unwrapError(
			await db
				.from('profiles')
				.update({ phone_number: '06 12 34 56 78' })
				.eq('user_id', profile.user_id)
				.select(),
		);
	});

	it('coerces empty string phone number to null', async () => {
		const db = await createClientAs(TestUsers.STUDENT_001);
		const profile = requireProfile(TestUsers.STUDENT_001);
		const originalPhoneNumber = profile.phone_number;

		const data = unwrap(
			await db.from('profiles').update({ phone_number: '' }).eq('user_id', profile.user_id).select(),
		);

		expect(data).toHaveLength(1);
		expect(data[0].phone_number).toBeNull();

		unwrap(
			await db
				.from('profiles')
				.update({ phone_number: originalPhoneNumber })
				.eq('user_id', profile.user_id)
				.select('user_id'),
		);
	});
});
