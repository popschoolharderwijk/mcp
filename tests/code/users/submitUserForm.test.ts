import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { AppRole } from '../../../src/lib/roles';
import type { UserFormEditContext, UserFormState } from '../../../src/lib/users/userFormHelpers';

const toastMessages: { type: 'error' | 'success' | 'warning'; message: string; description?: string }[] = [];

mock.module('sonner', () => ({
	toast: {
		error: (message: string, options?: { description?: string }) => {
			toastMessages.push({ type: 'error', message, description: options?.description });
		},
		success: (message: string, options?: { description?: string }) => {
			toastMessages.push({ type: 'success', message, description: options?.description });
		},
		warning: (message: string, options?: { description?: string }) => {
			toastMessages.push({ type: 'warning', message, description: options?.description });
		},
	},
}));

type TableResult = { data?: unknown; error?: { message: string } | null };

type RecordedCall =
	| { kind: 'update'; table: string; payload: unknown; filters: Record<string, unknown> }
	| { kind: 'insert'; table: string; payload: unknown }
	| { kind: 'delete'; table: string; filters: Record<string, unknown> }
	| { kind: 'invoke'; fn: string; body: unknown };

const recordedCalls: RecordedCall[] = [];
let tableResults: Record<string, TableResult> = {};
let invokeResult: TableResult = { data: null, error: null };

function resolveResult(table: string, kind: string): TableResult {
	return tableResults[`${table}:${kind}`] ?? { error: null };
}

function createQueryBuilder(table: string) {
	let operation = '';
	let payload: unknown;
	const filters: Record<string, unknown> = {};

	const execute = (): TableResult => {
		switch (operation) {
			case 'update':
				recordedCalls.push({ kind: 'update', table, payload, filters });
				return resolveResult(table, 'update');
			case 'insert':
				recordedCalls.push({ kind: 'insert', table, payload });
				return resolveResult(table, 'insert');
			case 'delete':
				recordedCalls.push({ kind: 'delete', table, filters });
				return resolveResult(table, 'delete');
			default:
				return { error: null };
		}
	};

	class QueryBuilder implements PromiseLike<TableResult> {
		update(nextPayload: unknown) {
			operation = 'update';
			payload = nextPayload;
			return this;
		}
		insert(nextPayload: unknown) {
			operation = 'insert';
			payload = nextPayload;
			return this;
		}
		delete() {
			operation = 'delete';
			return this;
		}
		eq(col: string, val: unknown) {
			filters[col] = val;
			return this;
		}
		// biome-ignore lint/suspicious/noThenProperty: supabase query builder mock
		then<TResult1 = TableResult, TResult2 = never>(
			onFulfilled?: ((value: TableResult) => TResult1 | PromiseLike<TResult1>) | null,
			onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
		) {
			return Promise.resolve(execute()).then(onFulfilled, onRejected);
		}
	}

	return new QueryBuilder();
}

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => createQueryBuilder(table),
		functions: {
			invoke: (fn: string, options?: { body?: unknown }) => {
				recordedCalls.push({ kind: 'invoke', fn, body: options?.body ?? null });
				return Promise.resolve(invokeResult);
			},
		},
	},
}));

function baseForm(overrides: Partial<UserFormState> = {}): UserFormState {
	return {
		email: 'new@example.com',
		first_name: 'Nieuw',
		last_name: 'Gebruiker',
		phone_number: '0612345678',
		date_of_birth: null,
		role: 'staff',
		...overrides,
	};
}

function editContext(overrides: Partial<UserFormEditContext> = {}): UserFormEditContext {
	return {
		user_id: 'user-1',
		role: 'staff',
		...overrides,
	};
}

describe('submitUserForm', () => {
	let submitUserForm: typeof import('../../../src/lib/users/submitUserForm').submitUserForm;

	beforeAll(async () => {
		({ submitUserForm } = await import('../../../src/lib/users/submitUserForm'));
	});

	beforeEach(() => {
		toastMessages.length = 0;
		recordedCalls.length = 0;
		tableResults = {};
		invokeResult = { data: null, error: null };
	});

	it('rejects submit when email is missing', async () => {
		const result = await submitUserForm(baseForm({ email: '' }), true, null);
		expect(result).toEqual({ ok: false });
		expect(toastMessages).toEqual([{ type: 'error', message: 'Email is verplicht' }]);
		expect(recordedCalls).toHaveLength(0);
	});

	it('rejects site_admin role assignment for non-site admins', async () => {
		const result = await submitUserForm(baseForm({ role: 'site_admin' }), false, null);
		expect(result).toEqual({ ok: false });
		expect(toastMessages).toEqual([
			{
				type: 'error',
				message: 'Geen toegang',
				description: 'Admins kunnen geen site_admin rollen toewijzen.',
			},
		]);
	});

	it('updates profile and skips role update when role is unchanged', async () => {
		const result = await submitUserForm(baseForm({ role: 'staff' }), true, editContext({ role: 'staff' }));
		expect(result).toEqual({ ok: true, mode: 'edit' });
		expect(recordedCalls).toEqual([
			{
				kind: 'update',
				table: 'profiles',
				payload: {
					email: 'new@example.com',
					first_name: 'Nieuw',
					last_name: 'Gebruiker',
					phone_number: '0612345678',
					date_of_birth: null,
				},
				filters: { user_id: 'user-1' },
			},
		]);
		expect(toastMessages).toEqual([{ type: 'success', message: 'Gebruiker bijgewerkt' }]);
	});

	it('deletes role when new role is null', async () => {
		const result = await submitUserForm(baseForm({ role: null }), true, editContext({ role: 'admin' }));
		expect(result).toEqual({ ok: true, mode: 'edit' });
		expect(recordedCalls[1]).toEqual({
			kind: 'delete',
			table: 'user_roles',
			filters: { user_id: 'user-1' },
		});
	});

	it('inserts role when current role is null', async () => {
		const result = await submitUserForm(baseForm({ role: 'admin' }), true, editContext({ role: null }));
		expect(result).toEqual({ ok: true, mode: 'edit' });
		expect(recordedCalls[1]).toEqual({
			kind: 'insert',
			table: 'user_roles',
			payload: { user_id: 'user-1', role: 'admin' },
		});
	});

	it('updates role when both roles are set and different', async () => {
		const result = await submitUserForm(baseForm({ role: 'staff' }), true, editContext({ role: 'admin' }));
		expect(result).toEqual({ ok: true, mode: 'edit' });
		expect(recordedCalls[1]).toEqual({
			kind: 'update',
			table: 'user_roles',
			payload: { role: 'staff' },
			filters: { user_id: 'user-1' },
		});
	});

	it('returns false when profile update fails', async () => {
		tableResults['profiles:update'] = { error: { message: 'profile failed' } };
		const result = await submitUserForm(baseForm(), true, editContext());
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]).toEqual({
			type: 'error',
			message: 'Fout bij bijwerken gebruiker',
			description: 'profile failed',
		});
	});

	it('returns false when role delete fails', async () => {
		tableResults['user_roles:delete'] = { error: { message: 'delete failed' } };
		const result = await submitUserForm(baseForm({ role: null }), true, editContext({ role: 'admin' }));
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]?.message).toBe('Fout bij bijwerken rol');
	});

	it('returns false when role insert fails', async () => {
		tableResults['user_roles:insert'] = { error: { message: 'insert failed' } };
		const result = await submitUserForm(baseForm({ role: 'staff' as AppRole }), true, editContext({ role: null }));
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]?.message).toBe('Fout bij toewijzen rol');
	});

	it('returns false when role update fails', async () => {
		tableResults['user_roles:update'] = { error: { message: 'update failed' } };
		const result = await submitUserForm(baseForm({ role: 'staff' }), true, editContext({ role: 'admin' }));
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]?.message).toBe('Fout bij bijwerken rol');
	});

	it('creates a user via edge function on success', async () => {
		invokeResult = {
			data: { user_id: 'user-new', email: 'new@example.com' },
			error: null,
		};
		const result = await submitUserForm(baseForm(), true, null);
		expect(result).toEqual({
			ok: true,
			mode: 'create',
			createdUser: {
				user_id: 'user-new',
				email: 'new@example.com',
				first_name: 'Nieuw',
				last_name: 'Gebruiker',
				avatar_url: null,
				phone_number: '0612345678',
				date_of_birth: null,
			},
		});
		expect(recordedCalls[0]).toEqual({
			kind: 'invoke',
			fn: 'create-user',
			body: {
				email: 'new@example.com',
				first_name: 'Nieuw',
				last_name: 'Gebruiker',
				phone_number: '0612345678',
				role: 'staff',
			},
		});
		expect(toastMessages[0]?.type).toBe('success');
	});

	it('shows warning toast when create-user returns a warning', async () => {
		invokeResult = {
			data: { user_id: 'user-new', warning: 'Rol niet toegekend' },
			error: null,
		};
		const result = await submitUserForm(baseForm(), true, null);
		expect(result.ok).toBe(true);
		expect(toastMessages[0]).toEqual({
			type: 'warning',
			message: 'Gebruiker aangemaakt',
			description: 'Rol niet toegekend',
		});
	});

	it('returns false when create-user invoke fails', async () => {
		invokeResult = { data: null, error: { message: 'invoke failed' } };
		const result = await submitUserForm(baseForm(), false, null);
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]?.type).toBe('error');
		expect(toastMessages[0]?.message).toBe('Fout bij aanmaken gebruiker');
	});

	it('returns false when create-user response contains error', async () => {
		invokeResult = { data: { error: 'Email bestaat al' }, error: null };
		const result = await submitUserForm(baseForm(), true, null);
		expect(result).toEqual({ ok: false });
		expect(toastMessages[0]).toEqual({
			type: 'error',
			message: 'Fout bij aanmaken gebruiker',
			description: 'Email bestaat al',
		});
	});
});
