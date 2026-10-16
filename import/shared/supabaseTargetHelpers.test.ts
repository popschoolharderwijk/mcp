import { describe, expect, it } from 'bun:test';
import { extractSupabaseProjectRef, isProductionDb, PRODUCTION_SUPABASE_PROJECT_REF } from './supabaseTargetHelpers';

describe('extractSupabaseProjectRef', () => {
	it('extracts the project ref from a standard Supabase URL', () => {
		expect(extractSupabaseProjectRef('https://exampledevref.supabase.co')).toBe('exampledevref');
		expect(extractSupabaseProjectRef('https://BNAGEPKXRYAUIFZYOXGO.supabase.co/')).toBe(
			PRODUCTION_SUPABASE_PROJECT_REF,
		);
	});

	it('returns null for empty or non-Supabase hosts', () => {
		expect(extractSupabaseProjectRef('')).toBeNull();
		expect(extractSupabaseProjectRef('not-a-url')).toBeNull();
		expect(extractSupabaseProjectRef('https://example.com')).toBeNull();
	});
});

describe('isProductionDb', () => {
	it('returns true only for the production project URL', () => {
		expect(isProductionDb(`https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`)).toBe(true);
		expect(isProductionDb('https://exampledevref.supabase.co')).toBe(false);
	});
});
