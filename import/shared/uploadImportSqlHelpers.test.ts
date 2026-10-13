import { describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PRODUCTION_SUPABASE_PROJECT_REF } from './supabaseTargetHelpers';
import { uploadImportSqlFiles } from './uploadImportSqlHelpers';

describe('uploadImportSqlFiles', () => {
	it('uploads SQL files in preferred order for a non-production project', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-upload-'));
		await writeFile(join(outDir, 'profiles.sql'), 'select 1;');
		await writeFile(join(outDir, 'courses.sql'), 'select 2;');
		await mkdir(join(outDir, 'subdir'));

		const uploaded: string[] = [];
		const result = await uploadImportSqlFiles({
			outDir,
			preferredSqlOrder: ['courses.sql', 'profiles.sql'],
			env: {
				SUPABASE_URL: 'https://exampledevref.supabase.co',
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

	it('requires typing the production project ref before uploading', async () => {
		const outDir = await mkdtemp(join(tmpdir(), 'import-upload-prod-'));
		await writeFile(join(outDir, 'courses.sql'), 'select 1;');

		const denied = await uploadImportSqlFiles({
			outDir,
			preferredSqlOrder: ['courses.sql'],
			env: {
				SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
				SUPABASE_DB_URL: 'postgresql://u:{PASSWORD}@h/db',
				SUPABASE_DB_PASSWORD: 'secret',
			},
			ask: async () => 'wrong',
			runPsqlFile: async () => ({ ok: true }),
			log: () => {},
		});
		expect(denied.ok).toBe(false);

		const allowed = await uploadImportSqlFiles({
			outDir,
			preferredSqlOrder: ['courses.sql'],
			env: {
				SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
				SUPABASE_DB_URL: 'postgresql://u:{PASSWORD}@h/db',
				SUPABASE_DB_PASSWORD: 'secret',
			},
			ask: async () => PRODUCTION_SUPABASE_PROJECT_REF,
			runPsqlFile: async () => ({ ok: true }),
			log: () => {},
		});
		expect(allowed).toEqual({ ok: true, files: ['courses.sql'] });
	});
});
