import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap } from '../shared/idMapHelpers';
import {
	buildTeacherImportBatch,
	DEFAULT_MAP_PATH,
	DEFAULT_OUT_PATH,
	parseTeachersCliArgs,
	teachersCliUsage,
} from './cliHelpers';

describe('parseTeachersCliArgs', () => {
	it('parses input path with defaults', () => {
		expect(parseTeachersCliArgs(['bun', 'cli.ts', 'teachers.jsonl'])).toEqual({
			ok: true,
			args: {
				inputPath: 'teachers.jsonl',
				mapPath: DEFAULT_MAP_PATH,
				outPath: DEFAULT_OUT_PATH,
			},
		});
	});

	it('parses --map and --out overrides', () => {
		expect(
			parseTeachersCliArgs([
				'bun',
				'cli.ts',
				'--map',
				'custom-map.json',
				'--out',
				'custom.sql',
				'teachers.jsonl',
			]),
		).toEqual({
			ok: true,
			args: {
				inputPath: 'teachers.jsonl',
				mapPath: 'custom-map.json',
				outPath: 'custom.sql',
			},
		});
	});

	it('rejects unknown flags and missing input', () => {
		expect(parseTeachersCliArgs(['bun', 'cli.ts', '--nope']).ok).toBe(false);
		expect(parseTeachersCliArgs(['bun', 'cli.ts']).ok).toBe(false);
		expect(teachersCliUsage()).toContain('import:teachers');
	});
});

describe('buildTeacherImportBatch', () => {
	it('creates rows, reuses id-map, and records failures and warnings', () => {
		const initial = createEmptyIdMap();
		initial.teacher = { 'oid-known': 'uuid-known' };

		const batch = buildTeacherImportBatch(
			[
				{
					_id: { $oid: 'oid-known' },
					name: 'Femke',
					surname: 'Bosman',
					email: 'a@example.com',
					instrument: 'zang',
					vogdateissued: '2023-12-06',
					vog: true,
					comments: 'note',
				},
				{
					_id: { $oid: 'oid-new' },
					name: 'Anna',
					surname: 'Test',
					email: 'b@example.com',
					instrument: 'studio',
					assets: { $oid: 'asset-1' },
					mystery_field: true,
				},
				{
					_id: { $oid: 'oid-fail' },
					name: 'No',
					surname: 'Email',
					email: '',
					user: 'legacy-user',
				},
			],
			initial,
			() => 'uuid-new',
		);

		expect(batch.report.created).toBe(1);
		expect(batch.report.updated).toBe(1);
		expect(batch.report.failed).toBe(1);
		expect(batch.sqlRows).toHaveLength(2);
		expect(batch.idMap.teacher?.['oid-known']).toBe('uuid-known');
		expect(batch.idMap.teacher?.['oid-new']).toBe('uuid-new');
		expect(batch.report.warnings).toEqual([
			{ oid: 'oid-new', reason: 'Unmapped instrument "studio" (no lesson type link)' },
		]);
		expect(batch.report.failures).toEqual([{ oid: 'oid-fail', reason: 'Missing email' }]);
		expect(batch.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch.report.ignoredKeys).toEqual(['assets', 'comments', 'user', 'vog']);
	});
});
