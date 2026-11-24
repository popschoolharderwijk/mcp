import { describe, expect, it } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureStudentFromSignup } from '../../../supabase/functions/approve-signup-request/ensureStudentFromSignup';
import type { SignupRequestRow } from '../../../supabase/functions/approve-signup-request/types';

const USER_ID = 'user-existing-1';
const NEW_USER_ID = 'user-new-1';

const reqRow: SignupRequestRow = {
	id: 'req-1',
	status: 'pending',
	email: 'jan@test.nl',
	first_name: 'Jan',
	last_name: 'Leerling',
	phone_number: '0612345678',
	date_of_birth: '2010-01-01',
	parent_name: 'Ouder',
	parent_email: 'ouder@test.nl',
	parent_phone_number: '0687654321',
	lesson_group_id: null,
};

type RecordedOp = { table: string; kind: 'update' | 'insert'; payload?: unknown };

function createEnsureSignupAdminMock(options: {
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

describe('ensureStudentFromSignup', () => {
	it('reuses an existing student without updating profiles or students', async () => {
		const { admin, ops } = createEnsureSignupAdminMock({
			rows: {
				profiles: { user_id: USER_ID },
				students: { user_id: USER_ID },
			},
			createUserId: 'must-not-be-called',
		});

		const result = await ensureStudentFromSignup(admin, reqRow);

		expect(result).toEqual({ ok: true, studentUserId: USER_ID });
		expect(ops).toEqual([]);
	});

	it('returns 409 when the existing account is not a student', async () => {
		const { admin, ops } = createEnsureSignupAdminMock({
			rows: {
				profiles: { user_id: USER_ID },
				students: null,
			},
			createUserId: 'must-not-be-called',
		});

		const result = await ensureStudentFromSignup(admin, reqRow);
		const failure = result as { ok: false; response: Response };

		expect(failure.ok).toBe(false);
		expect(failure.response.status).toBe(409);
		expect(await failure.response.json()).toEqual({
			error: 'Er bestaat al een account met dit e-mailadres dat geen leerling is',
		});
		expect(ops).toEqual([]);
	});

	it('writes profile and student data only for a newly created user', async () => {
		const { admin, ops } = createEnsureSignupAdminMock({
			rows: {
				profiles: null,
				students: null,
			},
			createUserId: NEW_USER_ID,
		});

		const result = await ensureStudentFromSignup(admin, reqRow);

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
