import { describe, expect, it } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureStudentUser } from '../../../supabase/functions/schedule-trial-lesson/ensureStudentUser';

const USER_ID = 'user-existing-1';
const NEW_USER_ID = 'user-new-1';

const trialArgs = {
	studentEmail: 'jan@test.nl',
	studentFirstName: 'Jan',
	studentLastName: 'Leerling',
	studentPhone: '0612345678',
	studentPayload: {
		date_of_birth: '2010-01-01',
		parent_name: 'Ouder',
		parent_email: 'ouder@test.nl',
		parent_phone_number: '0687654321',
	},
};

type RecordedOp = { table: string; kind: 'update' | 'insert'; payload?: unknown };

function createEnsureTrialAdminMock(options: {
	rows: Record<string, { user_id: string } | null>;
	createUserId: string;
}): { admin: SupabaseClient; ops: RecordedOp[] } {
	const ops: RecordedOp[] = [];

	const admin = {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => ({
						data: options.rows[table] ?? null,
						error: null,
					}),
				}),
			}),
			update: (payload: unknown) => {
				ops.push({ table, kind: 'update', payload });
				return {
					eq: async () => ({ data: null, error: null }),
				};
			},
			insert: async (payload: unknown) => {
				ops.push({ table, kind: 'insert', payload });
				return { data: null, error: null };
			},
		}),
		auth: {
			admin: {
				createUser: async () => ({
					data: { user: { id: options.createUserId } },
					error: null,
				}),
			},
		},
	};

	return { admin: admin as unknown as SupabaseClient, ops };
}

describe('ensureStudentUser', () => {
	it('leaves an existing student untouched without profile or student writes', async () => {
		const { admin, ops } = createEnsureTrialAdminMock({
			rows: {
				profiles: { user_id: USER_ID },
				students: { user_id: USER_ID },
			},
			createUserId: 'must-not-be-called',
		});

		const result = await ensureStudentUser(admin, trialArgs);

		expect(result).toEqual({ ok: true, studentUserId: USER_ID });
		expect(ops).toEqual([]);
	});

	it('inserts an empty student row when the profile exists without a student', async () => {
		const { admin, ops } = createEnsureTrialAdminMock({
			rows: {
				profiles: { user_id: USER_ID },
				students: null,
			},
			createUserId: 'must-not-be-called',
		});

		const result = await ensureStudentUser(admin, trialArgs);

		expect(result).toEqual({ ok: true, studentUserId: USER_ID });
		expect(ops).toEqual([{ table: 'students', kind: 'insert', payload: { user_id: USER_ID } }]);
	});

	it('writes profile and full student data only for a newly created user', async () => {
		const { admin, ops } = createEnsureTrialAdminMock({
			rows: {
				profiles: null,
				students: null,
			},
			createUserId: NEW_USER_ID,
		});

		const result = await ensureStudentUser(admin, trialArgs);

		expect(result).toEqual({ ok: true, studentUserId: NEW_USER_ID });
		expect(ops).toEqual([
			{
				table: 'profiles',
				kind: 'update',
				payload: {
					date_of_birth: '2010-01-01',
					phone_number: '0612345678',
				},
			},
			{
				table: 'students',
				kind: 'insert',
				payload: {
					user_id: NEW_USER_ID,
					parent_name: 'Ouder',
					parent_email: 'ouder@test.nl',
					parent_phone_number: '0687654321',
				},
			},
		]);
	});
});
