/**
 * The seeded tariffs must be exactly the published tarievenlijst per 1 September 2026,
 * because every tariff ends up in the Stripe catalog.
 */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Row = [
	type: string,
	duration: number,
	frequency: string,
	label: string | null,
	under: number | null,
	adult: number | null,
];

/** Tarievenlijst per 1 september 2026 (cents). Durations: see docs/integrations/tariefmodel.md. */
const TARIEVENLIJST: Row[] = [
	...['Gitaarles', 'Drumles', 'Zangles', 'Basles', 'Keyboardles', 'Saxofoonles'].flatMap((type): Row[] => [
		[type, 30, 'weekly', null, 7338, 8879],
		[type, 30, 'biweekly', null, 3867, 4679],
	]),
	['Duoles', 30, 'weekly', null, 5156, 6239],
	['Duoles', 30, 'biweekly', null, 2679, 3241],
	['De Popkids', 60, 'weekly', null, 2455, null],
	['Popkoor', 60, 'weekly', '12-18 jaar', 3000, null],
	['Popkoor', 60, 'weekly', '18+', 3000, 3631],
	['Bandcoaching', 60, 'biweekly', null, 1691, 2046],
	['Klank en Kriebels', 45, 'weekly', null, 6600, null],
	['Notenkrakers', 45, 'weekly', null, 6600, null],
	["Mini Maestro's", 45, 'weekly', null, 7650, null],
	['De Muziekclub', 45, 'weekly', null, 7650, null],
	['DJ-School', 60, 'weekly', null, 10996, 13305],
	['Laatbloeiers', 60, 'weekly', null, null, 8250],
];

function parseSeedBlock(): Row[] {
	const sql = readFileSync(join(import.meta.dir, '../../../supabase/seeds/bootstrap.sql'), 'utf8');
	const block = sql.slice(sql.indexOf('-- BEGIN TARIEVENLIJST'), sql.indexOf('-- END TARIEVENLIJST'));
	const re = /\('((?:[^']|'')+)', (\d+), '(\w+)', (NULL|'[^']*'), (NULL|\d+), (NULL|\d+)\)/g;
	const rows: Row[] = [];
	for (const m of block.matchAll(re)) {
		const num = (v: string) => (v === 'NULL' ? null : Number(v));
		rows.push([
			m[1].replace(/''/g, "'"),
			Number(m[2]),
			m[3],
			m[4] === 'NULL' ? null : m[4].slice(1, -1),
			num(m[5]),
			num(m[6]),
		]);
	}
	return rows;
}

describe('bootstrap tariffs', () => {
	it('are exactly the published tarievenlijst', () => {
		const key = (r: Row) => `${r[0]}|${r[1]}|${r[2]}|${r[3] ?? ''}`;
		const sort = (rows: Row[]) => [...rows].sort((a, b) => key(a).localeCompare(key(b)));
		expect(sort(parseSeedBlock())).toEqual(sort(TARIEVENLIJST));
	});

	it('use 1 September 2026 as effective date', () => {
		const sql = readFileSync(join(import.meta.dir, '../../../supabase/seeds/bootstrap.sql'), 'utf8');
		expect(sql).toContain("SELECT lto.id, DATE '2026-09-01', v.under_cents, v.adult_cents");
	});
});
