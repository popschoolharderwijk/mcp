import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { emptyStudentForm } from '../../../src/components/students/studentFormTypes';

let invokeResult: { data: unknown; error: unknown } = {
	data: { user_id: 'user-1' },
	error: null,
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		functions: {
			invoke: async () => invokeResult,
		},
	},
}));

mock.module('../../../src/lib/auth/invokeError', () => ({
	getInvokeErrorMessage: async () => 'invoke failed',
}));

const { createStudentRecord } = await import('../../../src/components/students/studentFormPersistence');

describe('createStudentRecord', () => {
	beforeEach(() => {
		invokeResult = {
			data: { user_id: 'user-1' },
			error: null,
		};
	});

	it('creates student via create-student edge function for new-user mode', async () => {
		expect(await createStudentRecord(emptyStudentForm, 'new-user', null)).toEqual({
			ok: true,
			userId: 'user-1',
		});
	});

	it('creates student via create-student edge function for existing-user mode', async () => {
		expect(await createStudentRecord(emptyStudentForm, 'existing-user', 'existing-user-1')).toEqual({
			ok: true,
			userId: 'user-1',
		});
	});

	it('returns invoke error when edge function call fails', async () => {
		invokeResult = {
			data: null,
			error: { message: 'network failed' },
		};
		expect(await createStudentRecord(emptyStudentForm, 'new-user', null)).toEqual({
			ok: false,
			title: 'Fout bij aanmaken leerling',
			description: 'invoke failed',
		});
	});

	it('returns edge function error payload', async () => {
		invokeResult = {
			data: { error: 'duplicate' },
			error: null,
		};
		expect(await createStudentRecord(emptyStudentForm, 'new-user', null)).toEqual({
			ok: false,
			title: 'Fout bij aanmaken leerling',
			description: 'duplicate',
		});
	});
});
