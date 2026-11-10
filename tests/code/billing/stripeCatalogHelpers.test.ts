import { describe, expect, it } from 'bun:test';
import {
	applyCatalogOptionFilters,
	buildCatalogDesiredPrices,
	buildCatalogLookupKey,
	buildCatalogOptionStatusPatch,
	buildCatalogProductName,
	type CatalogOptionInput,
	mapCatalogOptionRow,
	planCatalogOptionSync,
	planCatalogProductUpdate,
	resolveSyncedCatalogRow,
	summarizeCatalogSyncResults,
	UNSYNCED_CATALOG_STATUSES,
} from '../../../supabase/functions/_shared/stripeCatalogHelpers';

type RecordedQueryCall =
	| { kind: 'eq'; column: string; value: string }
	| { kind: 'in'; column: string; values: readonly string[] };

function createRecordingQuery() {
	const calls: RecordedQueryCall[] = [];
	const query = {
		eq(column: string, value: string) {
			calls.push({ kind: 'eq', column, value });
			return query;
		},
		in(column: string, values: readonly string[]) {
			calls.push({ kind: 'in', column, values });
			return query;
		},
	};
	return { query, calls };
}

const baseOption: CatalogOptionInput = {
	id: 'opt-1',
	lesson_type_name: 'Gitaar',
	lesson_type_active: true,
	duration_minutes: 30,
	frequency: 'weekly',
	price_per_lesson_youth_cents: 2500,
	price_per_lesson_adult_cents: 3025,
};

describe('stripeCatalogHelpers', () => {
	it('builds a Dutch product name from duration and frequency', () => {
		expect(buildCatalogProductName(baseOption)).toBe('Gitaar · 30 min · wekelijks');
	});

	it('builds lookup keys that include option, age band and amount', () => {
		expect(buildCatalogLookupKey('opt-1', 'youth', 2500)).toBe('mcp_lto_opt-1_youth_2500');
	});

	it('emits youth and adult desired prices when both cents are set', () => {
		const prices = buildCatalogDesiredPrices(baseOption);
		expect(prices).toHaveLength(2);
		expect(prices[0]).toEqual({
			age_band: 'youth',
			amount_cents: 2500,
			lookup_key: 'mcp_lto_opt-1_youth_2500',
			nickname: 'Jonger dan 21 · 2500 ct',
		});
		expect(prices[1].age_band).toBe('adult');
		expect(prices[1].amount_cents).toBe(3025);
	});

	it('plans create product and prices when Stripe is empty', () => {
		const plan = planCatalogOptionSync(baseOption, null, []);
		expect(plan.createProduct).toBe(true);
		expect(plan.createPrices).toHaveLength(2);
		expect(plan.archivePriceIds).toEqual([]);
	});

	it('archives stale prices when the amount changes', () => {
		const plan = planCatalogOptionSync(
			baseOption,
			{ stripe_product_id: 'prod_1', name: 'Gitaar · 30 min · wekelijks', active: true },
			[
				{
					stripe_price_id: 'price_old',
					lookup_key: 'mcp_lto_opt-1_youth_2000',
					active: true,
					unit_amount: 2000,
					age_band: 'youth',
				},
				{
					stripe_price_id: 'price_adult',
					lookup_key: 'mcp_lto_opt-1_adult_3025',
					active: true,
					unit_amount: 3025,
					age_band: 'adult',
				},
			],
		);
		expect(plan.createProduct).toBe(false);
		expect(plan.createPrices.map((p) => p.lookup_key)).toEqual(['mcp_lto_opt-1_youth_2500']);
		expect(plan.archivePriceIds).toEqual(['price_old']);
	});

	it('deactivates the product when the lesson type is inactive', () => {
		const plan = planCatalogOptionSync(
			{ ...baseOption, lesson_type_active: false },
			{ stripe_product_id: 'prod_1', name: 'Gitaar · 30 min · wekelijks', active: true },
			[],
		);
		expect(plan.createProduct).toBe(false);
		expect(plan.productUpdate).toEqual({ active: false });
	});

	it('summarizes sync result rows', () => {
		expect(
			summarizeCatalogSyncResults([
				{ lesson_type_option_id: 'a', name: 'A', status: 'synced', changed: true },
				{ lesson_type_option_id: 'b', name: 'B', status: 'skipped', changed: false },
				{ lesson_type_option_id: 'c', name: 'C', status: 'error', changed: false, error: 'x' },
			]),
		).toEqual({ synced: 1, skipped: 1, errors: 1, changed: 1 });
	});

	it('maps option rows and joins lesson type metadata', () => {
		expect(
			mapCatalogOptionRow({
				id: 'opt-1',
				duration_minutes: 30,
				frequency: 'weekly',
				price_per_lesson_youth_cents: 2500,
				price_per_lesson_adult_cents: null,
				lesson_types: [{ name: 'Gitaar', is_active: true }],
			}),
		).toEqual({
			id: 'opt-1',
			lesson_type_name: 'Gitaar',
			lesson_type_active: true,
			duration_minutes: 30,
			frequency: 'weekly',
			price_per_lesson_youth_cents: 2500,
			price_per_lesson_adult_cents: null,
		});
	});

	it('marks empty catalog sync as skipped when nothing changed', () => {
		expect(resolveSyncedCatalogRow('opt-1', 'Gitaar', null, false, false)).toEqual({
			lesson_type_option_id: 'opt-1',
			name: 'Gitaar',
			status: 'skipped',
			changed: false,
		});
		expect(resolveSyncedCatalogRow('opt-1', 'Gitaar', 'prod_1', true, true).status).toBe('synced');
	});

	it('maps sync results onto durable option status patches', () => {
		expect(
			buildCatalogOptionStatusPatch(
				{ lesson_type_option_id: 'opt-1', name: 'Gitaar', status: 'synced', changed: true },
				'2026-11-10T12:00:00.000Z',
			),
		).toEqual({
			stripe_catalog_status: 'synced',
			stripe_catalog_synced_at: '2026-11-10T12:00:00.000Z',
			stripe_catalog_sync_error: null,
		});
		expect(
			buildCatalogOptionStatusPatch(
				{ lesson_type_option_id: 'opt-1', name: 'Gitaar', status: 'skipped', changed: false },
				'2026-11-10T12:00:00.000Z',
			),
		).toEqual({
			stripe_catalog_status: 'synced',
			stripe_catalog_synced_at: '2026-11-10T12:00:00.000Z',
			stripe_catalog_sync_error: null,
		});
		expect(
			buildCatalogOptionStatusPatch(
				{
					lesson_type_option_id: 'opt-1',
					name: 'Gitaar',
					status: 'error',
					changed: false,
					error: 'Stripe down',
				},
				'2026-11-10T12:00:00.000Z',
			),
		).toEqual({
			stripe_catalog_status: 'error',
			stripe_catalog_sync_error: 'Stripe down',
		});
	});

	it('plans product updates for rename, activate, and deactivate', () => {
		expect(planCatalogProductUpdate(true, null, null, baseOption)).toBeNull();
		expect(
			planCatalogProductUpdate(false, null, { stripe_product_id: 'p', name: 'x', active: true }, null),
		).toEqual({ active: false });
		expect(
			planCatalogProductUpdate(true, null, { stripe_product_id: 'p', name: 'x', active: false }, null),
		).toBeNull();
		expect(
			planCatalogProductUpdate(
				true,
				'New name',
				{ stripe_product_id: 'p', name: 'Old', active: true },
				baseOption,
			),
		).toEqual({ name: 'New name' });
		expect(
			planCatalogProductUpdate(
				false,
				'Gitaar · 30 min · wekelijks',
				{ stripe_product_id: 'p', name: 'Gitaar · 30 min · wekelijks', active: true },
				baseOption,
			),
		).toEqual({ active: false });
		expect(
			planCatalogProductUpdate(
				true,
				'Gitaar · 30 min · wekelijks',
				{ stripe_product_id: 'p', name: 'Gitaar · 30 min · wekelijks', active: true },
				baseOption,
			),
		).toBeNull();
	});

	it('applies no catalog option filters when scope is empty', () => {
		const { query, calls } = createRecordingQuery();
		expect(applyCatalogOptionFilters(query, {})).toBe(query);
		expect(calls).toEqual([]);
	});

	it('applies option, lesson-type, and unsynced catalog filters', () => {
		const { query, calls } = createRecordingQuery();
		applyCatalogOptionFilters(query, {
			lesson_type_option_id: 'opt-1',
			lesson_type_id: 'lt-1',
			unsynced_only: true,
		});
		expect(calls).toEqual([
			{ kind: 'eq', column: 'id', value: 'opt-1' },
			{ kind: 'eq', column: 'lesson_type_id', value: 'lt-1' },
			{ kind: 'in', column: 'stripe_catalog_status', values: UNSYNCED_CATALOG_STATUSES },
		]);
	});
});
