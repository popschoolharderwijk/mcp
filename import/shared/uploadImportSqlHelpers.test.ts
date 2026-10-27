import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { uploadImportSqlFiles } from './uploadImportSqlHelpers';

describe('uploadImportSqlFiles', () => {
	it('uploads SQL files in preferred order', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-upload-'));
		await writeFile(join(outDir, 'profiles.sql'), 'select 1;');
		await writeFile(join(outDir, 'courses.sql'), 'select 2;');
		await mkdir(join(outDir, 'subdir'));

		const uploaded: string[] = [];
		const result = await uploadImportSqlFiles({
			outDir,
			preferredSqlOrder: ['courses.sql', 'profiles.sql'],
			env: {
				SUPABASE_DB_URL: 'postgresql://u:{PASSWORD}@h/db',
				SUPABASE_DB_PASSWORD: 'secret',
			},
			runPsqlFile: async (_dbUrl, sqlPath) => {
				uploaded.push(sqlPath);
				return { ok: true };
			},
			log: () => {},
		});

		expect(result).toEqual({ ok: true, files: ['courses.sql', 'profiles.sql'] });
		expect(uploaded).toEqual([join(outDir, 'courses.sql'), join(outDir, 'profiles.sql')]);
	});

	it('uploads when only a local Docker DB URL is configured', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-upload-local-'));
		await writeFile(join(outDir, 'courses.sql'), 'select 1;');

		const dbUrls: string[] = [];
		const result = await uploadImportSqlFiles({
			outDir,
			preferredSqlOrder: ['courses.sql'],
			env: {
				SUPABASE_DB_URL: 'postgresql://postgres:{PASSWORD}@localhost:54422/postgres',
				SUPABASE_DB_PASSWORD: 'postgres',
			},
			runPsqlFile: async (dbUrl) => {
				dbUrls.push(dbUrl);
				return { ok: true };
			},
			log: () => {},
		});

		expect(result).toEqual({ ok: true, files: ['courses.sql'] });
		expect(dbUrls).toEqual(['postgresql://postgres:postgres@localhost:54422/postgres']);
	});
});
