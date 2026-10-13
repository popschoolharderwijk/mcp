import { describe, expect, it } from 'bun:test';
import type { ImportConverter } from './converterTypes';
import { type ImportCliDeps, runImportCli } from './importCliHelpers';

const stubCourses = { name: 'courses' } as ImportConverter;
const stubProfiles = { name: 'profiles' } as ImportConverter;

function baseDeps(overrides: Partial<ImportCliDeps> = {}): ImportCliDeps {
	return {
		converterNames: ['courses', 'profiles'],
		converters: { courses: stubCourses, profiles: stubProfiles } as ImportCliDeps['converters'],
		logPath: 'import/out/import.log',
		outDir: 'import/out',
		preferredSqlOrder: ['courses.sql', 'profiles.sql'],
		resolvePath: (path) => `/abs/${path}`,
		resetImportLog: async () => {},
		runImportConverter: async () => {},
		uploadImportSqlFiles: async () => ({ ok: true, files: ['courses.sql', 'profiles.sql'] }),
		log: () => {},
		error: () => {},
		...overrides,
	};
}

describe('runImportCli', () => {
	it('returns 1 when the command is invalid', async () => {
		const errors: string[] = [];
		const code = await runImportCli(
			['bun', 'import/index.ts', 'teachers'],
			baseDeps({ error: (m) => errors.push(m) }),
		);
		expect(code).toBe(1);
		expect(errors).toHaveLength(1);
	});

	it('always runs the full pipeline then uploads when --upload is set', async () => {
		const ran: string[] = [];
		const logs: string[] = [];
		const code = await runImportCli(
			['bun', 'import/index.ts', '--upload'],
			baseDeps({
				resetImportLog: async (path) => {
					ran.push(`reset:${path}`);
				},
				runImportConverter: async (converter) => {
					ran.push(`convert:${converter.name}`);
				},
				uploadImportSqlFiles: async (params) => {
					ran.push(`upload:${params.outDir}`);
					return { ok: true, files: ['courses.sql', 'profiles.sql'] };
				},
				log: (m) => logs.push(m),
			}),
		);
		expect(code).toBe(0);
		expect(ran).toEqual([
			'reset:/abs/import/out/import.log',
			'convert:courses',
			'convert:profiles',
			'upload:/abs/import/out',
		]);
		expect(logs.some((line) => line.includes('Uploaded: courses.sql, profiles.sql'))).toBe(true);
	});

	it('returns 1 when upload fails', async () => {
		const errors: string[] = [];
		const code = await runImportCli(
			['bun', 'import/index.ts', '--upload'],
			baseDeps({
				uploadImportSqlFiles: async () => ({ ok: false, error: 'boom' }),
				error: (m) => errors.push(m),
			}),
		);
		expect(code).toBe(1);
		expect(errors).toEqual(['boom']);
	});
});
