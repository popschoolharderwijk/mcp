/**
 * Lesson fee rules. The SQL functions in the tariff migration are the single source of
 * truth; this test loads that block into an in-memory Postgres (PGlite) and checks it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const BEGIN = '-- BEGIN PURE TARIFF FUNCTIONS';
const END = '-- END PURE TARIFF FUNCTIONS';

function loadPureSql(): string {
	// Concatenate every pure block in migration order, so later migrations override earlier definitions.
	const dir = join(import.meta.dir, '../../../supabase/migrations');
	const files = readdirSync(dir)
		.filter((f) => f.endsWith('.sql'))
		.sort();
	const blocks: string[] = [];
	for (const file of files) {
		const sql = readFileSync(join(dir, file), 'utf8');
		const start = sql.indexOf(BEGIN);
		if (start >= 0) blocks.push(sql.slice(start, sql.indexOf(END)));
	}
	if (blocks.length === 0) throw new Error('Pure tariff functions not found in migrations');
	return blocks.join('\n');
}

type Tariff = { effective_from: string; amount_under_21_cents: number | null; amount_adult_cents: number | null };
type Fee = {
	amount_cents: number;
	age_category: string | null;
	btw_rate: number;
	amount_excl_btw_cents: number;
	btw_amount_cents: number;
	is_prorated: boolean;
};

const WEEKLY_PRIVATE: Tariff[] = [
	{ effective_from: '2026-09-01', amount_under_21_cents: 7338, amount_adult_cents: 8879 },
];

let db: PGlite;

beforeAll(async () => {
	// Other tests may define a fake `window`; PGlite would then boot in browser mode.
	const g = globalThis as { window?: unknown };
	const savedWindow = g.window;
	if (savedWindow !== undefined)
		Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });
	try {
		db = new PGlite();
		await db.waitReady;
		await db.exec(loadPureSql());
	} finally {
		if (savedWindow !== undefined) {
			Object.defineProperty(globalThis, 'window', { value: savedWindow, configurable: true });
		}
	}
});

afterAll(async () => {
	await db.close();
});

async function fee(args: {
	tariffs?: Tariff[];
	kind?: 'monthly' | 'one_off';
	hasAdult?: boolean;
	dob: string | null;
	start: string;
	end?: string | null;
	month: string;
}): Promise<Fee> {
	const res = await db.query<Fee>(
		`SELECT amount_cents::int, age_category, btw_rate, amount_excl_btw_cents::int, btw_amount_cents::int, is_prorated
		 FROM public.compute_lesson_fee($1, $2, $3::jsonb, $4::date, $5::date, $6::date, $7::date)`,
		[
			args.kind ?? 'monthly',
			args.hasAdult ?? true,
			JSON.stringify(args.tariffs ?? WEEKLY_PRIVATE),
			args.dob,
			args.start,
			args.end ?? null,
			args.month,
		],
	);
	return res.rows[0];
}

async function scalar(sql: string, params: unknown[]): Promise<string> {
	const res = await db.query<{ v: string }>(sql, params);
	return String(res.rows[0].v);
}

describe('compute_lesson_fee', () => {
	it('1. weekly private, under 21, full month: 7338 without VAT', async () => {
		expect(await fee({ dob: '2012-05-01', start: '2026-09-01', month: '2026-10-01' })).toEqual({
			amount_cents: 7338,
			age_category: 'under_21',
			btw_rate: 0,
			amount_excl_btw_cents: 7338,
			btw_amount_cents: 0,
			is_prorated: false,
		});
	});

	it('2. weekly private, 21+: 8879 incl. 1541 VAT', async () => {
		expect(await fee({ dob: '1990-01-01', start: '2026-09-01', month: '2026-10-01' })).toMatchObject({
			amount_cents: 8879,
			age_category: '21_plus',
			btw_rate: 21,
			amount_excl_btw_cents: 7338,
			btw_amount_cents: 1541,
		});
	});

	it('3. 21st birthday mid-year (14 March 2027): March under 21, April 21+', async () => {
		const base = { dob: '2006-03-14', start: '2026-09-01' };
		expect((await fee({ ...base, month: '2027-03-01' })).amount_cents).toBe(7338);
		expect((await fee({ ...base, month: '2027-04-01' })).amount_cents).toBe(8879);
	});

	it('4. birthday on the 1st of the month: 21+ starts the month after', async () => {
		const base = { dob: '2006-03-01', start: '2026-09-01' };
		expect((await fee({ ...base, month: '2027-03-01' })).age_category).toBe('under_21');
		expect((await fee({ ...base, month: '2027-04-01' })).age_category).toBe('21_plus');
	});

	it('5. joining on 15 October: 7338 x 17/31 = 4024, November full', async () => {
		const base = { dob: '2012-05-01', start: '2026-10-15' };
		expect(await fee({ ...base, month: '2026-10-01' })).toMatchObject({ amount_cents: 4024, is_prorated: true });
		expect(await fee({ ...base, month: '2026-11-01' })).toMatchObject({ amount_cents: 7338, is_prorated: false });
	});

	it('6. August is 0, September is full again', async () => {
		const base = { dob: '2012-05-01', start: '2026-09-01' };
		expect((await fee({ ...base, month: '2027-08-01' })).amount_cents).toBe(0);
		expect((await fee({ ...base, month: '2027-09-01' })).amount_cents).toBe(7338);
	});

	it('7. tariff change per 1 September applies to a running agreement', async () => {
		const tariffs: Tariff[] = [
			...WEEKLY_PRIVATE,
			{ effective_from: '2027-09-01', amount_under_21_cents: 7600, amount_adult_cents: 9196 },
		];
		const base = { tariffs, dob: '2012-05-01', start: '2026-09-01' };
		expect((await fee({ ...base, month: '2027-07-01' })).amount_cents).toBe(7338);
		expect((await fee({ ...base, month: '2027-09-01' })).amount_cents).toBe(7600);
	});

	it('8. lesson form without 21+ tariff (Popkids): student of 25 pays 2455 without VAT', async () => {
		const tariffs: Tariff[] = [
			{ effective_from: '2026-09-01', amount_under_21_cents: 2455, amount_adult_cents: null },
		];
		expect(
			await fee({ tariffs, hasAdult: false, dob: '2001-01-01', start: '2026-09-01', month: '2026-10-01' }),
		).toMatchObject({ amount_cents: 2455, btw_rate: 0, age_category: 'under_21' });
	});

	it('9. only a 21+ tariff (Laatbloeiers): student of 19 pays the 21+ amount', async () => {
		const tariffs: Tariff[] = [
			{ effective_from: '2026-09-01', amount_under_21_cents: null, amount_adult_cents: 8250 },
		];
		expect(
			await fee({ tariffs, kind: 'one_off', dob: '2007-06-01', start: '2026-09-07', month: '2026-09-01' }),
		).toMatchObject({ amount_cents: 8250, btw_rate: 21, amount_excl_btw_cents: 6818, btw_amount_cents: 1432 });
	});

	it('10. month before start and month after the end date are 0', async () => {
		const base = { dob: '2012-05-01', start: '2026-10-01', end: '2027-02-28' };
		expect((await fee({ ...base, month: '2026-09-01' })).amount_cents).toBe(0);
		expect((await fee({ ...base, month: '2027-02-01' })).amount_cents).toBe(7338);
		expect((await fee({ ...base, month: '2027-03-01' })).amount_cents).toBe(0);
	});

	it('11. group lesson (one-off): 6600 in the start month, 0 the month after', async () => {
		const tariffs: Tariff[] = [
			{ effective_from: '2026-09-01', amount_under_21_cents: 6600, amount_adult_cents: null },
		];
		const base = { tariffs, kind: 'one_off' as const, hasAdult: false, dob: null, start: '2026-09-14' };
		expect(await fee({ ...base, month: '2026-09-01' })).toMatchObject({ amount_cents: 6600, is_prorated: false });
		expect((await fee({ ...base, month: '2026-10-01' })).amount_cents).toBe(0);
	});

	it('12. no tariff valid on the date gives a clear error', async () => {
		await expect(fee({ dob: '2012-05-01', start: '2026-06-01', month: '2026-06-01' })).rejects.toThrow(
			'Geen tarief ingesteld per 01-06-2026',
		);
	});

	it('14. unknown date of birth with both tariffs gives a clear error, no silent 21+', async () => {
		await expect(fee({ dob: null, start: '2026-09-01', month: '2026-10-01' })).rejects.toThrow(
			'Geboortedatum ontbreekt',
		);
	});

	it('14b. unknown date of birth is fine when only one tariff exists', async () => {
		const tariffs: Tariff[] = [
			{ effective_from: '2026-09-01', amount_under_21_cents: 2455, amount_adult_cents: null },
		];
		expect(
			(await fee({ tariffs, hasAdult: false, dob: null, start: '2026-09-01', month: '2026-10-01' })).amount_cents,
		).toBe(2455);
	});
});

describe('agreement term', () => {
	it('minimum term runs to the end of the month of start + 6 months - 1 day', async () => {
		expect(await scalar('SELECT public.compute_minimum_term_end($1::date)::text AS v', ['2026-09-01'])).toBe(
			'2027-02-28',
		);
		expect(await scalar('SELECT public.compute_minimum_term_end($1::date)::text AS v', ['2026-10-15'])).toBe(
			'2027-04-30',
		);
		expect(await scalar('SELECT public.compute_minimum_term_end($1::date)::text AS v', ['2026-08-31'])).toBe(
			'2027-02-28',
		);
	});

	it('13. cancellation ends at the end of the running period', async () => {
		const sql = 'SELECT public.compute_cancellation_effective_date($1::date, $2::date, $3)::text AS v';
		// Within the minimum term, notice met: ends at the minimum term end.
		expect(await scalar(sql, ['2027-02-28', '2027-01-10', 30])).toBe('2027-02-28');
		// After the minimum term: ends 31 July of the running school year.
		expect(await scalar(sql, ['2027-02-28', '2027-03-15', 30])).toBe('2027-07-31');
		// Too late for 31 July 2027: moves to 31 July 2028.
		expect(await scalar(sql, ['2027-02-28', '2027-07-10', 30])).toBe('2028-07-31');
	});
});
