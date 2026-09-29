import { describe, expect, it } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { executeNewMandateCreate } from '../../../src/lib/direct-debit/mandateCreateHelpers';

const validInput = {
	studentId: 'student-1',
	iban: 'NL91ABNA0417164300',
	bic: '',
	holder: 'Jan Jansen',
	signedAt: '2026-01-01',
	method: 'paper' as const,
};

function createMockSupabase(options: {
	rpcResult?: { data: string | null; error: { message: string } | null };
	insertResult?: { error: { message: string } | null };
}) {
	return {
		rpc: async () => options.rpcResult ?? { data: 'MND-001', error: null },
		from: () => ({
			insert: async () => options.insertResult ?? { error: null },
		}),
	} as unknown as SupabaseClient;
}

describe('executeNewMandateCreate', () => {
	it('returns validation error for invalid input', async () => {
		const result = await executeNewMandateCreate(createMockSupabase({}), {
			...validInput,
			studentId: null,
		});
		expect(result).toEqual({ ok: false, kind: 'validation', error: 'missing-fields' });
	});

	it('returns reference error when rpc fails', async () => {
		const result = await executeNewMandateCreate(
			createMockSupabase({ rpcResult: { data: null, error: { message: 'rpc failed' } } }),
			validInput,
		);
		expect(result).toEqual({ ok: false, kind: 'reference', message: 'rpc failed' });
	});

	it('returns insert error when insert fails', async () => {
		const result = await executeNewMandateCreate(
			createMockSupabase({ insertResult: { error: { message: 'insert failed' } } }),
			validInput,
		);
		expect(result).toEqual({ ok: false, kind: 'insert', message: 'insert failed' });
	});

	it('returns ok when mandate is created', async () => {
		const result = await executeNewMandateCreate(createMockSupabase({}), validInput);
		expect(result).toEqual({ ok: true });
	});
});
