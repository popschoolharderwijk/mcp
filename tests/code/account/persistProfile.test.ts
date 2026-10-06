import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

type UpdateResult = { error: { message: string } | null };

let updateResult: UpdateResult = { error: null };
let lastUpdatePayload: Record<string, unknown> | null = null;
let lastUpdateUserId: string | null = null;

const supabaseMock = {
	from: () => ({
		update: (payload: Record<string, unknown>) => {
			lastUpdatePayload = payload;
			return {
				eq: (_column: string, userId: string) => {
					lastUpdateUserId = userId;
					return Promise.resolve(updateResult);
				},
			};
		},
	}),
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

describe('persistProfile', () => {
	let persistProfile: typeof import('../../../src/lib/account/persistence').persistProfile;

	beforeAll(async () => {
		({ persistProfile } = await import('../../../src/lib/account/persistence'));
	});

	beforeEach(() => {
		updateResult = { error: null };
		lastUpdatePayload = null;
		lastUpdateUserId = null;
	});

	it('normalizes empty strings to null and persists profile fields', async () => {
		const result = await persistProfile('user-1', {
			first_name: '',
			last_name: 'Jansen',
			phone_number: '',
		});

		expect(result).toEqual({ error: null });
		expect(lastUpdateUserId).toBe('user-1');
		expect(lastUpdatePayload).toEqual({
			first_name: null,
			last_name: 'Jansen',
			phone_number: null,
		});
	});

	it('persists a normalized phone number', async () => {
		const result = await persistProfile('user-2', {
			first_name: 'Anna',
			last_name: 'Bakker',
			phone_number: '0612345678',
		});

		expect(result).toEqual({ error: null });
		expect(lastUpdatePayload).toEqual({
			first_name: 'Anna',
			last_name: 'Bakker',
			phone_number: '0612345678',
		});
	});

	it('collapses whitespace in names and trims phone', async () => {
		const result = await persistProfile('user-2', {
			first_name: '  Anna   Marie ',
			last_name: '  van   der Berg ',
			phone_number: ' 0612345678 ',
		});

		expect(result).toEqual({ error: null });
		expect(lastUpdatePayload).toEqual({
			first_name: 'Anna Marie',
			last_name: 'van der Berg',
			phone_number: '0612345678',
		});
	});

	it('returns the Supabase error message when update fails', async () => {
		updateResult = { error: { message: 'update failed' } };
		const result = await persistProfile('user-3', {
			first_name: 'Jan',
			last_name: 'Pietersen',
			phone_number: '0698765432',
		});

		expect(result).toEqual({ error: 'update failed' });
	});
});
